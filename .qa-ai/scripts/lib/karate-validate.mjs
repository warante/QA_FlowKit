/**
 * Karate executable .feature validation (dependency-free).
 * For QA design Gherkin under gherkin.featurePath, use gherkin-validate.mjs instead.
 */
import { duplicateCaseIdErrors, hasRequiredTag, normalizeId } from './gherkin-validate.mjs';

const featurePattern = /^Feature:/i;
const scenarioPattern = /^(?:Scenario|Scenario Outline):/i;
const starStepPattern = /^\*\s+/;
const cucumberStepPattern = /^(?:Given|When|Then|And|But)\b/i;
const qaAcceptancePattern = /^(?:Acceptance Criteria:|Criterios de aceptaci[oó]n:)/i;

const apiStepHints = [
  /\bmethod\s+/i,
  /\bstatus\s+\d/i,
  /\bmatch\b/i,
  /\burl\b/i,
  /\bpath\b/i,
  /\brequest\b/i,
  /\bresponse\b/i,
  /\bcall\s+read\b/i,
  /\bconfigure\b/i,
  /\bheader\b/i
];

const uiStepHints = [
  /\bdriver\b/i,
  /\bclick\b/i,
  /\binput\b/i,
  /\bwaitFor\b/i,
  /\bscript\b/i,
  /\blocate\b/i,
  /\bscreenshot\b/i,
  /\bwindow\b/i,
  /\bframe\b/i
];

const idTagPattern = /^@(?:id|test|case):(.+)$/i;
const rfTagPattern = /^@rf:(.+)$/i;

export function parseKarateFeature(content) {
  const model = {
    featureLines: [],
    scenarioBlocks: [],
    tags: [],
    starSteps: [],
    cucumberSteps: [],
    hasQaAcceptanceBlock: false
  };

  const lines = content.split(/\r?\n/);
  let currentScenario = null;

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const line = index + 1;

    if (trimmed.startsWith('@')) {
      for (const tag of trimmed.split(/\s+/).filter(Boolean)) {
        model.tags.push({ line, tag });
        if (currentScenario) currentScenario.tags.push({ line, tag });
      }
      continue;
    }
    if (featurePattern.test(trimmed)) {
      model.featureLines.push({ line, text: trimmed });
      continue;
    }
    if (scenarioPattern.test(trimmed)) {
      currentScenario = { line, title: trimmed, tags: [], steps: [] };
      model.scenarioBlocks.push(currentScenario);
      continue;
    }
    if (qaAcceptancePattern.test(trimmed)) {
      model.hasQaAcceptanceBlock = true;
      continue;
    }
    if (starStepPattern.test(trimmed)) {
      const step = { line, text: trimmed };
      model.starSteps.push(step);
      if (currentScenario) currentScenario.steps.push(step);
      continue;
    }
    if (cucumberStepPattern.test(trimmed)) {
      const step = { line, text: trimmed };
      model.cucumberSteps.push(step);
      if (currentScenario) currentScenario.steps.push(step);
    }
  }

  return model;
}

function scenarioHasApiHints(steps) {
  const text = steps.map((s) => s.text).join('\n');
  return apiStepHints.some((pattern) => pattern.test(text));
}

function scenarioHasUiHints(steps) {
  const text = steps.map((s) => s.text).join('\n');
  return uiStepHints.some((pattern) => pattern.test(text));
}

function caseIdsFromKarateTags(tags) {
  return tags
    .map(({ tag }) => tag.match(idTagPattern)?.[1])
    .filter(Boolean)
    .map(normalizeId);
}

/**
 * @param {object} options
 * @param {boolean} [options.strictRf]
 * @param {boolean} [options.strictStarSteps] - error on Given/When/Then without *
 * @param {boolean} [options.isUiPath]
 */
export function validateKarateFeatureContent(content, filePath, options = {}) {
  const errors = [];
  const warnings = [];
  const parsed = parseKarateFeature(content);

  if (parsed.featureLines.length === 0) {
    errors.push('Missing Feature: title (Karate requires a Feature block).');
  } else if (parsed.featureLines.length > 1) {
    errors.push(`Expected one Feature title, found ${parsed.featureLines.length}.`);
  }

  if (parsed.scenarioBlocks.length === 0) {
    errors.push('Expected at least one Scenario or Scenario Outline.');
  }

  if (parsed.hasQaAcceptanceBlock) {
    errors.push(
      'QA design block "Acceptance Criteria:" belongs under gherkin.featurePath (features/), not Karate execution features.'
    );
  }

  if (parsed.starSteps.length === 0 && parsed.scenarioBlocks.length > 0) {
    errors.push('Karate features should use * steps (e.g. * url, * method post, * match).');
  }

  if (options.strictStarSteps !== false && parsed.cucumberSteps.length > 0) {
    for (const step of parsed.cucumberSteps) {
      warnings.push(`Line ${step.line}: prefer Karate * syntax instead of Cucumber keyword step.`);
    }
  }

  for (const scenario of parsed.scenarioBlocks) {
    if (scenario.steps.length === 0) {
      errors.push(`Scenario at line ${scenario.line} has no steps.`);
      continue;
    }
    const scenarioUi = scenarioHasUiHints(scenario.steps);
    const scenarioApi = scenarioHasApiHints(scenario.steps);
    if (options.isUiPath) {
      if (!scenarioUi && !scenarioApi) {
        warnings.push(`UI Karate scenario at line ${scenario.line}: consider driver, click, or input steps.`);
      }
    } else if (!scenarioApi && !scenarioUi) {
      errors.push(
        `API Karate scenario at line ${scenario.line} should include method, status, match, url, or path steps.`
      );
    } else if (!options.isUiPath && !scenarioApi && scenarioUi) {
      warnings.push(`Scenario at line ${scenario.line} looks like UI steps under an API Karate folder.`);
    }
  }

  if (options.strictRf) {
    const allTags = parsed.tags;
    const hasRf = allTags.some(({ tag }) => rfTagPattern.test(tag)) || hasRequiredTag(content, '@rf');
    if (!hasRf) errors.push('Missing recommended tag @rf:<RF-ID> (required with --strict-rf).');
  }

  const caseIds = [...new Set(caseIdsFromKarateTags(parsed.tags))].sort();

  return {
    errors,
    warnings,
    caseIds,
    file: filePath
  };
}

export function karateDuplicateIdErrors(results) {
  return duplicateCaseIdErrors(results, (id, files) => `Duplicate @id ${id} in Karate features: ${files.join(', ')}`);
}

export function isQaDesignFeatureContent(content) {
  const parsed = parseKarateFeature(content);
  if (parsed.hasQaAcceptanceBlock) return true;
  const hasManualTag = hasRequiredTag(content, '@manual');
  const hasPriority = hasRequiredTag(content, '@priority');
  const singleScenario = parsed.scenarioBlocks.length === 1;
  const cucumberOnly = parsed.starSteps.length === 0 && parsed.cucumberSteps.length > 0;
  return hasManualTag && hasPriority && singleScenario && cucumberOnly && parsed.hasQaAcceptanceBlock;
}
