import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isConfiguredFramework } from './project-config.mjs';
import { getConfigValue, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { isValidatorAllowed } from './harness-validator-allowlist.mjs';
import { validatePhasePermissions } from './harness-permissions.mjs';
const CONTRACT_RELATIVE_PATH = '.qa-ai/contracts/workflow.v1.json';

export const QA_TRACK_IDS = ['quick', 'standard', 'enterprise'];

export const QA_TRACKS = {
  quick: {
    label: 'Quick',
    description:
      'Requirements to Gherkin, traceability and PR summary without test-management sync or automation implementation.'
  },
  standard: {
    label: 'Standard',
    description:
      'Full QA workflow: test-management planning, feasibility, automation phases when configured, and PR summary.'
  },
  enterprise: {
    label: 'Enterprise',
    description:
      'Standard workflow plus strict target validation and release-readiness checks for compliance-oriented teams.'
  }
};

export function normalizeQaTrack(value) {
  const normalized = String(value || 'standard')
    .trim()
    .toLowerCase();
  if (['quick', 'fast', 'minimal', 'light'].includes(normalized)) return 'quick';
  if (['enterprise', 'compliance', 'regulated'].includes(normalized)) return 'enterprise';
  if (['standard', 'method', 'full', 'default'].includes(normalized)) return 'standard';
  return QA_TRACK_IDS.includes(normalized) ? normalized : 'standard';
}

const PHASE_TOP_LEVEL_KEYS = new Set([
  'id',
  'name',
  'slashCommand',
  'guidance',
  'inputs',
  'outputs',
  'entryApprovals',
  'validators',
  'skipConditions',
  'permissions',
  'requiresRfId'
]);

const OUTPUT_TOP_LEVEL_KEYS = new Set(['path', 'fallback', 'kind', 'required']);
const INPUT_TOP_LEVEL_KEYS = new Set(['path', 'fallback', 'required']);
const SKIP_CONDITION_KEYS = new Set(['field', 'equals', 'notEquals', 'notConfigured']);

let cachedContract = null;

export function contractRelativePath() {
  return CONTRACT_RELATIVE_PATH;
}

export function defaultContractPath(cwd) {
  return path.join(cwd, CONTRACT_RELATIVE_PATH);
}

export async function loadWorkflowContract(cwd, { frameworkRoot = null } = {}) {
  let contractPath = frameworkRoot
    ? path.join(frameworkRoot, 'contracts', 'workflow.v1.json')
    : defaultContractPath(cwd);

  if (!(await pathExists(contractPath))) {
    contractPath = resolveFrameworkContractPath();
  }

  if (!cachedContract || cachedContract.path !== contractPath) {
    const content = await readText(contractPath);
    const data = JSON.parse(content);
    cachedContract = { path: contractPath, data };
  }

  return JSON.parse(JSON.stringify(cachedContract.data));
}

export function clearContractCache() {
  cachedContract = null;
}

export function resolveContractPath(config, pathRef, fallback = '') {
  if (!pathRef) return fallback || '';
  const text = String(pathRef).trim();
  if (text.startsWith('$config.')) {
    const key = text.slice('$config.'.length);
    const value = String(getConfigValue(config, key, '') || '').trim();
    return value || fallback || '';
  }
  return text;
}

export function resolveOutputSpec(config, outputSpec) {
  return {
    path: resolveContractPath(config, outputSpec.path, outputSpec.fallback),
    kind: outputSpec.kind || 'file',
    required: outputSpec.required !== false
  };
}

function isEnabled(value) {
  return (
    value === true ||
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

function isConfiguredTool(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'n/a', 'na'].includes(normalized);
}

export function buildWorkflowContext(config) {
  const track = normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));
  return {
    track,
    knowledgeEnabled: isEnabled(getConfigValue(config, 'knowledge.enabled', false)),
    testManagementConfigured: isConfiguredTool(getConfigValue(config, 'tools.testManagement', '')),
    issueTrackerConfigured: isConfiguredTool(getConfigValue(config, 'tools.issueTracker', '')),
    uiAutomationConfigured: isConfiguredFramework(
      String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase()
    ),
    apiAutomationConfigured: isConfiguredFramework(
      String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase()
    )
  };
}

function resolveFieldValue(config, field) {
  if (field === 'project.qaTrack') {
    return normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));
  }
  if (field === 'knowledge.enabled') {
    return isEnabled(getConfigValue(config, 'knowledge.enabled', false));
  }
  if (field === 'sources.external.enabled') {
    return isEnabled(getConfigValue(config, 'sources.external.enabled', false));
  }
  if (field === 'testDesign.quality.mode') {
    return String(getConfigValue(config, 'testDesign.quality.mode', 'off')).toLowerCase();
  }
  if (field === 'tools.testManagement') {
    return isConfiguredTool(getConfigValue(config, 'tools.testManagement', ''));
  }
  if (field === 'tools.issueTracker') {
    return isConfiguredTool(getConfigValue(config, 'tools.issueTracker', ''));
  }
  if (field === 'automation.ui.framework') {
    return isConfiguredFramework(String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase());
  }
  if (field === 'automation.api.framework') {
    return isConfiguredFramework(String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase());
  }
  if (field === 'automation.healing.enabled') {
    return isEnabled(getConfigValue(config, 'automation.healing.enabled', false));
  }
  return getConfigValue(config, field, undefined);
}

export function evaluateSkipCondition(config, condition) {
  const value = resolveFieldValue(config, condition.field);

  if (condition.notConfigured === true) {
    if (condition.field === 'tools.testManagement') {
      return !isConfiguredTool(getConfigValue(config, 'tools.testManagement', ''));
    }
    if (condition.field === 'tools.issueTracker') {
      return !isConfiguredTool(getConfigValue(config, 'tools.issueTracker', ''));
    }
    if (condition.field === 'automation.ui.framework') {
      return !isConfiguredFramework(String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase());
    }
    if (condition.field === 'automation.api.framework') {
      return !isConfiguredFramework(String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase());
    }
    return false;
  }

  if (Object.hasOwn(condition, 'equals')) {
    if (condition.field === 'project.qaTrack') {
      return normalizeQaTrack(value) === normalizeQaTrack(condition.equals);
    }
    return value === condition.equals;
  }

  if (Object.hasOwn(condition, 'notEquals')) {
    if (condition.field === 'project.qaTrack') {
      return normalizeQaTrack(value) !== normalizeQaTrack(condition.notEquals);
    }
    return value !== condition.notEquals;
  }

  return false;
}

export function getPhaseSkipReason(config, phaseDef) {
  for (const condition of phaseDef.skipConditions || []) {
    if (evaluateSkipCondition(config, condition)) {
      if (condition.notConfigured) {
        return `${condition.field} is none or missing`;
      }
      if (condition.field === 'knowledge.enabled' && condition.equals === false) {
        return 'knowledge.enabled is false';
      }
      if (condition.field === 'project.qaTrack' && condition.equals === 'quick') {
        return `not included in ${normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'))} track`;
      }
      if (condition.field === 'project.qaTrack' && condition.notEquals === 'enterprise') {
        return 'project.qaTrack is not enterprise';
      }
      return `skip condition matched for ${condition.field}`;
    }
  }
  return null;
}

export function getPhaseMap(contract) {
  return new Map((contract.phases || []).map((phase) => [phase.id, phase]));
}

export function getTrackPhaseOrder(contract, track) {
  const normalized = normalizeQaTrack(track);
  return contract.trackOrder?.[normalized] || contract.trackOrder?.standard || [];
}

export function toLegacyPhaseDefinition(phaseDef) {
  const guidance = phaseDef.guidance || [];
  const agentEntry = guidance.find((item) => item.startsWith('.qa-ai/agents/'));
  const workflowEntry = guidance.find((item) => item.startsWith('.qa-ai/workflows/'));
  const agent = agentEntry ? path.basename(agentEntry) : null;

  const legacy = {
    name: phaseDef.name,
    slashCommand: phaseDef.slashCommand || '/qa-full-flow',
    agent,
    workflow: workflowEntry || null
  };

  const outputs = phaseDef.outputs || [];
  const featureOutput = outputs.find((item) => item.kind === 'featureFiles');
  const releaseOutput = outputs.find((item) => item.kind === 'releaseGate');
  const configArtifactOutput = outputs.find((item) => item.path === '$config.traceability.matrixPath');

  if (featureOutput) {
    legacy.featureFiles = true;
  } else if (releaseOutput) {
    legacy.releaseGate = true;
  } else if (configArtifactOutput) {
    legacy.configArtifact = 'traceability.matrixPath';
  } else if (outputs.length > 0) {
    legacy.artifacts = outputs
      .filter((item) => !item.kind || item.kind === 'file')
      .map((item) => {
        if (item.path?.startsWith('$config.')) {
          return item.path.slice('$config.'.length);
        }
        return item.path;
      })
      .filter(Boolean);
  }

  if ((phaseDef.validators || []).includes('validate-test-design')) {
    legacy.validateScript = 'node .qa-ai/scripts/validate-test-design.mjs --allow-missing';
  } else if ((phaseDef.validators || []).includes('validate-traceability')) {
    legacy.validateScript = 'node .qa-ai/scripts/validate-traceability.mjs';
  } else if ((phaseDef.validators || []).includes('validate-quality-report')) {
    legacy.validateScript = 'node .qa-ai/scripts/validate-quality-report.mjs';
  } else if ((phaseDef.validators || []).includes('validate-release-gate')) {
    legacy.validateScript = 'node .qa-ai/scripts/validate-release-gate.mjs';
  } else if ((phaseDef.validators || []).includes('validate-healing-log')) {
    legacy.validateScript = 'node .qa-ai/scripts/validate-healing-log.mjs';
  }

  return legacy;
}

export async function loadLegacyWorkflowDefinitions(cwd) {
  const contract = await loadWorkflowContract(cwd);
  const trackPhaseOrder = contract.trackOrder || {};
  const phaseDefinitions = {};

  for (const phase of contract.phases) {
    phaseDefinitions[phase.id] = toLegacyPhaseDefinition(phase);
  }

  return {
    contract,
    trackPhaseOrder,
    phaseDefinitions
  };
}

function assertNoUnknownKeys(object, allowedKeys, label) {
  for (const key of Object.keys(object)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${label} has unknown field: ${key}`);
    }
  }
}

function looksLikeShellCommand(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  return (
    value.startsWith('node ') ||
    value.startsWith('npm ') ||
    value.startsWith('npx ') ||
    value.includes('&&') ||
    value.includes('|') ||
    value.includes('`')
  );
}

function validatePathReference(cwd, pathRef, label) {
  if (!pathRef) return;
  const text = String(pathRef).trim();
  if (looksLikeShellCommand(text)) {
    throw new Error(`${label} must not contain shell commands.`);
  }
  if (text.startsWith('$config.')) {
    const key = text.slice('$config.'.length);
    if (!key || key.includes(' ')) {
      throw new Error(`${label} has invalid config reference: ${text}`);
    }
    return;
  }
  if (path.isAbsolute(text)) {
    throw new Error(`${label} must not be absolute: ${text}`);
  }
  if (text.includes('..')) {
    throw new Error(`${label} must not traverse outside the repository: ${text}`);
  }
  resolveRepoPath(cwd, text, { label });
}

export function validateWorkflowContractData(cwd, contract) {
  const errors = [];

  if (contract.schemaVersion !== 1) {
    errors.push(`Unsupported schemaVersion: ${contract.schemaVersion}`);
  }

  if (!contract.trackOrder || typeof contract.trackOrder !== 'object') {
    errors.push('trackOrder is required.');
  }

  if (!Array.isArray(contract.phases) || contract.phases.length === 0) {
    errors.push('phases must be a non-empty array.');
    return errors;
  }

  const phaseIds = new Set();
  for (const phase of contract.phases) {
    try {
      assertNoUnknownKeys(phase, PHASE_TOP_LEVEL_KEYS, `phase ${phase.id || '<unknown>'}`);
    } catch (error) {
      errors.push(error.message);
      continue;
    }

    if (!phase.id || typeof phase.id !== 'string') {
      errors.push('Each phase requires a string id.');
      continue;
    }
    if (phaseIds.has(phase.id)) {
      errors.push(`Duplicate phase id: ${phase.id}`);
    }
    phaseIds.add(phase.id);

    if (!phase.name) errors.push(`Phase ${phase.id} requires name.`);

    for (const guidancePath of phase.guidance || []) {
      try {
        validatePathReference(cwd, guidancePath, `phase ${phase.id} guidance`);
      } catch (error) {
        errors.push(error.message);
      }
    }

    for (const input of phase.inputs || []) {
      try {
        assertNoUnknownKeys(input, INPUT_TOP_LEVEL_KEYS, `phase ${phase.id} input`);
        validatePathReference(cwd, input.path, `phase ${phase.id} input path`);
      } catch (error) {
        errors.push(error.message);
      }
    }

    for (const output of phase.outputs || []) {
      try {
        assertNoUnknownKeys(output, OUTPUT_TOP_LEVEL_KEYS, `phase ${phase.id} output`);
        if (output.path) validatePathReference(cwd, output.path, `phase ${phase.id} output path`);
        if (output.fallback) validatePathReference(cwd, output.fallback, `phase ${phase.id} output fallback`);
      } catch (error) {
        errors.push(error.message);
      }
    }

    for (const condition of phase.skipConditions || []) {
      try {
        assertNoUnknownKeys(condition, SKIP_CONDITION_KEYS, `phase ${phase.id} skipCondition`);
        if (!condition.field) {
          errors.push(`Phase ${phase.id} skipCondition requires field.`);
        }
      } catch (error) {
        errors.push(error.message);
      }
    }

    for (const validatorId of phase.validators || []) {
      if (!isValidatorAllowed(validatorId)) {
        errors.push(`Phase ${phase.id} references unknown validator: ${validatorId}`);
      }
    }

    try {
      validatePhasePermissions(phase.permissions, phase.id);
    } catch (error) {
      errors.push(`Phase ${phase.id}: ${error.message}`);
    }
  }

  for (const [track, order] of Object.entries(contract.trackOrder || {})) {
    if (!Array.isArray(order)) {
      errors.push(`trackOrder.${track} must be an array.`);
      continue;
    }
    for (const phaseId of order) {
      if (!phaseIds.has(phaseId)) {
        errors.push(`trackOrder.${track} references unknown phase: ${phaseId}`);
      }
    }
  }

  return errors;
}

export async function validateWorkflowContract(cwd) {
  const contractPath = defaultContractPath(cwd);
  if (!(await pathExists(contractPath))) {
    return { ok: false, errors: [`Missing workflow contract: ${CONTRACT_RELATIVE_PATH}`] };
  }

  let contract;
  try {
    contract = await loadWorkflowContract(cwd);
  } catch (error) {
    return { ok: false, errors: [`Invalid workflow contract JSON: ${error.message}`] };
  }

  const errors = validateWorkflowContractData(cwd, contract);
  return { ok: errors.length === 0, errors, contract };
}

export function resolveFrameworkContractPath() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(scriptDir, '../../contracts/workflow.v1.json');
}
