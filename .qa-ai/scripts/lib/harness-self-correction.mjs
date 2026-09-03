import { appendRunEvent, readRunSnapshot } from './harness-run-store.mjs';
import { loadQaAiConfig } from './utils.mjs';
import { runPhaseValidators } from './harness-validation.mjs';
import { getPhaseMap, loadWorkflowContract } from './harness-contract.mjs';

/**
 * Self-correction loop configuration defaults
 */
export const DEFAULT_SELF_CORRECTION_CONFIG = {
  enabled: false,
  maxIterations: 3,
  phases: [],
  feedbackMode: 'inline',
  oscillationDetection: true,
  escalationOnFailure: true,
  phaseLimits: {}
};

/**
 * Resolve self-correction configuration from qa-ai.config.yaml
 */
export function resolveSelfCorrectionConfig(config) {
  const workflow = config?.workflow || {};
  const selfCorrection = workflow.selfCorrection || {};
  return {
    ...DEFAULT_SELF_CORRECTION_CONFIG,
    ...selfCorrection
  };
}

/**
 * Check if self-correction is enabled for a specific phase
 */
export function isSelfCorrectionEnabled(config, phaseId) {
  const scConfig = resolveSelfCorrectionConfig(config);
  if (!scConfig.enabled) return false;
  if (!scConfig.phases || scConfig.phases.length === 0) return false;
  return scConfig.phases.includes(phaseId);
}

/**
 * Get max iterations for a phase (supports per-phase override)
 */
export function getMaxIterations(config, phaseId) {
  const scConfig = resolveSelfCorrectionConfig(config);
  if (scConfig.phaseLimits && scConfig.phaseLimits[phaseId] !== undefined) {
    return scConfig.phaseLimits[phaseId];
  }
  return scConfig.maxIterations;
}

/**
 * Extract error signature from validation result for oscillation detection
 */
function extractErrorSignature(validationResult) {
  if (!validationResult || !validationResult.errors) return '';
  return validationResult.errors
    .map((e) => `${e.code || e.type || 'unknown'}:${e.path || ''}:${e.message || ''}`)
    .sort()
    .join('|');
}

/**
 * Detect oscillation by comparing current errors with previous iterations
 */
export function detectOscillation(currentErrors, previousIterations) {
  if (!previousIterations || previousIterations.length === 0) return false;

  const currentSignature = extractErrorSignature({ errors: currentErrors });

  // Check for exact match with previous iteration
  const lastIteration = previousIterations[previousIterations.length - 1];
  if (lastIteration && lastIteration.errorSignature === currentSignature) {
    return true;
  }

  // Check for error cycle (A -> B -> A pattern)
  if (previousIterations.length >= 2) {
    const twoAgo = previousIterations[previousIterations.length - 2];
    if (twoAgo && twoAgo.errorSignature === currentSignature) {
      return true;
    }
  }

  // Check for no progress (error count not decreasing)
  if (lastIteration && currentErrors.length >= lastIteration.errorCount) {
    // Same or more errors than last iteration - potential stagnation
    // Only flag if the errors are identical
    if (currentSignature === lastIteration.errorSignature) {
      return true;
    }
  }

  return false;
}

/**
 * Record a correction iteration in the run event log
 */
export async function recordCorrectionIteration(cwd, runId, phaseId, iteration, validationResult, correctionAction) {
  const errorSignature = extractErrorSignature(validationResult);
  await appendRunEvent(cwd, runId, {
    type: 'phase.correction_attempt',
    phaseId,
    iteration,
    errorCount: validationResult.errors?.length || 0,
    errorSignature,
    errors: validationResult.errors?.slice(0, 5) || [], // Limit to first 5 errors for brevity
    correctionAction: correctionAction || null,
    passed: validationResult.ok || false,
    timestamp: new Date().toISOString()
  });
}

/**
 * Record self-correction completion (success)
 */
export async function recordCorrectionSuccess(cwd, runId, phaseId, totalIterations) {
  await appendRunEvent(cwd, runId, {
    type: 'phase.correction_completed',
    phaseId,
    iterationsUsed: totalIterations,
    outcome: 'success',
    timestamp: new Date().toISOString()
  });
}

/**
 * Record self-correction escalation (failure/oscillation)
 */
export async function recordCorrectionEscalation(cwd, runId, phaseId, reason, iterationsUsed, errorSummary) {
  await appendRunEvent(cwd, runId, {
    type: 'phase.correction_escalated',
    phaseId,
    reason, // 'max_iterations_reached' | 'oscillation_detected' | 'unresolvable_error'
    iterationsUsed,
    errorSummary: errorSummary || [],
    timestamp: new Date().toISOString()
  });
}

/**
 * Build correction feedback for the agent
 */
export function buildCorrectionFeedback(validationResult, iteration, maxIterations) {
  if (!validationResult || validationResult.ok) return null;

  return {
    iteration,
    maxIterations,
    remainingIterations: maxIterations - iteration,
    errors: validationResult.errors || [],
    errorCount: validationResult.errors?.length || 0,
    guidance: generateCorrectionGuidance(validationResult.errors)
  };
}

/**
 * Generate human-readable correction guidance from validation errors
 */
function generateCorrectionGuidance(errors) {
  if (!errors || errors.length === 0) return [];

  return errors.map((error) => {
    const code = error.code || error.type || 'UNKNOWN';
    const path = error.path || 'unknown location';
    const message = error.message || 'Validation failed';

    return {
      code,
      location: path,
      message,
      suggestion: mapErrorToSuggestion(code, message)
    };
  });
}

/**
 * Map error codes to actionable suggestions
 */
function mapErrorToSuggestion(code, message) {
  const suggestions = {
    GHK_MISSING_TAG: 'Add the missing required tag. Check .qa-ai/rules/gherkin.rules.md for required tags.',
    GHK_INVALID_TAG: 'Fix the tag format. Tags must follow the pattern @key:value.',
    GHK_MISSING_ACCEPTANCE_CRITERIA: 'Add an Acceptance Criteria section to the Feature.',
    GHK_DUPLICATE_ID: 'Ensure each scenario has a unique @id: tag.',
    GHK_INVALID_LAYOUT: 'Check scenario structure. Ensure proper Given/When/Then format.',
    TD_MISSING_SECTION: 'Add the missing section to the test design document.',
    TD_INVALID_TRACEABILITY: 'Ensure all test cases trace back to a requirement ID.',
    TRC_MISSING_LINK: 'Add traceability links between requirements and test cases.',
    TRC_ORPHAN_TEST: 'Link the test case to a requirement or mark as out-of-scope.'
  };

  // Try exact match first
  if (suggestions[code]) return suggestions[code];

  // Try partial match
  const partialKey = Object.keys(suggestions).find((key) => code.includes(key) || key.includes(code.split('_')[0]));
  if (partialKey) return suggestions[partialKey];

  // Default suggestion
  return `Review the error at ${code}: ${message}. Consult the relevant rules in .qa-ai/rules/ for guidance.`;
}

/**
 * Execute self-correction loop for a phase
 *
 * @param {string} cwd - Working directory
 * @param {string} runId - Active run ID
 * @param {string} phaseId - Phase being validated
 * @param {object} initialValidationResult - Initial validation result
 * @param {function} correctionCallback - Async function that receives feedback and applies corrections
 * @returns {object} - { success: boolean, iterations: number, reason?: string }
 */
export async function executeSelfCorrectionLoop(cwd, runId, phaseId, initialValidationResult, correctionCallback) {
  const configInfo = await loadQaAiConfig(cwd);
  const scConfig = resolveSelfCorrectionConfig(configInfo.data);

  if (!scConfig.enabled || !isSelfCorrectionEnabled(configInfo.data, phaseId)) {
    return { success: initialValidationResult.ok, iterations: 0, skipped: true };
  }

  const maxIterations = getMaxIterations(configInfo.data, phaseId);
  let currentResult = initialValidationResult;
  const iterationHistory = [];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (currentResult.ok) {
      // Validation passed
      if (iteration > 1) {
        await recordCorrectionSuccess(cwd, runId, phaseId, iteration - 1);
      }
      return { success: true, iterations: iteration - 1 };
    }

    // Check oscillation before attempting correction
    if (scConfig.oscillationDetection && detectOscillation(currentResult.errors, iterationHistory)) {
      await recordCorrectionEscalation(
        cwd,
        runId,
        phaseId,
        'oscillation_detected',
        iteration - 1,
        currentResult.errors
      );
      return { success: false, iterations: iteration - 1, reason: 'oscillation_detected' };
    }

    // Build feedback for the agent
    const feedback = buildCorrectionFeedback(currentResult, iteration, maxIterations);

    // Record this iteration
    await recordCorrectionIteration(cwd, runId, phaseId, iteration, currentResult, null);

    // Call the correction callback to apply fixes
    try {
      await correctionCallback(feedback);
    } catch (error) {
      await recordCorrectionEscalation(cwd, runId, phaseId, 'correction_callback_failed', iteration, [
        { code: 'CALLBACK_ERROR', message: error.message }
      ]);
      return { success: false, iterations: iteration, reason: 'correction_callback_failed' };
    }

    // Store iteration data for oscillation detection
    iterationHistory.push({
      iteration,
      errorCount: currentResult.errors?.length || 0,
      errorSignature: extractErrorSignature(currentResult)
    });

    // Re-run validation
    const contract = await loadWorkflowContract(cwd);
    const phaseMap = getPhaseMap(contract);
    const phaseDef = phaseMap.get(phaseId);
    const snapshot = await readRunSnapshot(cwd, runId);

    currentResult = await runPhaseValidators(cwd, {
      phaseDef,
      config: configInfo.data,
      snapshot
    });

    // Record the correction attempt result
    await recordCorrectionIteration(cwd, runId, phaseId, iteration, currentResult, 'correction_applied');
  }

  // Max iterations reached without success
  if (!currentResult.ok) {
    await recordCorrectionEscalation(
      cwd,
      runId,
      phaseId,
      'max_iterations_reached',
      maxIterations,
      currentResult.errors
    );
    return { success: false, iterations: maxIterations, reason: 'max_iterations_reached' };
  }

  return { success: true, iterations: maxIterations };
}
