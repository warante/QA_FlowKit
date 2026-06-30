/**
 * Gherkin feature file parsing and validation (dependency-free).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseGherkin } from './gherkin-parser.mjs';

export const rfPattern = /\bRF[-_ ]?[A-Z0-9]+\b/i;
export const idPattern = /\b(?:RF|TC|TEST|QA)(?:[-_][A-Z0-9]+| \d[A-Z0-9]*|\d+)\b/gi;
export const caseIdPattern = /\b(?:TC|TEST|QA)(?:[-_][A-Z0-9]+| \d[A-Z0-9]*|\d+)\b/gi;

/** Supported `@type:` values for Gherkin features (see gherkin.rules.md). */
export const GHERKIN_TYPE_VALUES = new Set([
  'functional',
  'regression',
  'smoke',
  'e2e',
  'integration',
  'api',
  'negative',
  'edge-case',
  'accessibility',
  'performance',
  'security'
]);

export function requiredTagName(tag) {
  const normalized = String(tag).trim();
  if (!normalized) return '';
  const withPrefix = normalized.startsWith('@') ? normalized : `@${normalized}`;
  return withPrefix.replace(/:$/, '');
}

export function findLine(content, prefix) {
  return content.split(/\r?\n/).find((line) => line.trim().toLowerCase().startsWith(prefix.toLowerCase())) || '';
}

export function normalizeLanguage(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (['es', 'esp', 'spa', 'spanish', 'espanol', 'espa\u00f1ol'].includes(normalized)) return 'es';
  if (['en', 'eng', 'english', 'ingles', 'ingl\u00e9s'].includes(normalized)) return 'en';
  return 'en';
}

/** Like normalizeLanguage but exits the process when the value is not a supported language code. */
export function normalizeLanguageStrict(value, label = 'language') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (['es', 'esp', 'spa', 'spanish', 'espanol', 'espa\u00f1ol'].includes(normalized)) return 'es';
  if (['en', 'eng', 'english', 'ingles', 'ingl\u00e9s'].includes(normalized)) return 'en';
  console.error(`Unsupported ${label}: ${value}. Use "en" or "es".`);
  process.exit(1);
}

export function languageRules(language) {
  if (language === 'es') {
    return {
      code: 'es',
      featurePattern: /^(?:Caracter\u00edstica|Caracteristica):/i,
      scenarioPattern: /^(?:Escenario|Esquema del escenario):/i,
      featurePrefixes: ['Caracter\u00edstica:', 'Caracteristica:'],
      scenarioPrefixes: ['Escenario:', 'Esquema del escenario:'],
      acceptancePattern: /^Criterios de aceptaci\u00f3n:/i,
      acceptanceLabel: 'Criterios de aceptaci\u00f3n'
    };
  }
  return {
    code: 'en',
    featurePattern: /^Feature:/i,
    scenarioPattern: /^Scenario(?: Outline)?:/i,
    featurePrefixes: ['Feature:'],
    scenarioPrefixes: ['Scenario:', 'Scenario Outline:'],
    acceptancePattern: /^Acceptance Criteria:/i,
    acceptanceLabel: 'Acceptance Criteria'
  };
}

export function findAnyLine(content, prefixes) {
  for (const prefix of prefixes) {
    const line = findLine(content, prefix);
    if (line) return line;
  }
  return '';
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasRequiredTag(content, tagName) {
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(tagName)}:[^\\s]+`, 'm');
  return pattern.test(content);
}

export function normalizeId(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

export function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

export function caseIdsFromText(value) {
  return [...String(value || '').matchAll(caseIdPattern)].map((match) => normalizeId(match[0]));
}

export function caseIdsFromTags(model) {
  const caseTagPattern = /^@(?:id|test|case|testrail):(.+)$/i;
  return model.tags
    .map(({ tag }) => tag.match(caseTagPattern)?.[1])
    .filter(Boolean)
    .map(normalizeId);
}

function normalizeTechniqueTag(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative && !relative.startsWith('..') && !path.isAbsolute(relative)) || relative === '';
}

function statisticalAssertions(ast, language) {
  const pattern =
    language === 'es'
      ? /^(?:Entonces)\s+.+\s+debe\s+cumplir\s+.+\s+en\s+al\s+menos\s+(\d+)%\s+de\s+(\d+)\s+ejecuciones$/i
      : /^(?:Then)\s+.+\s+should\s+satisfy\s+.+\s+in\s+at\s+least\s+(\d+)%\s+of\s+(\d+)\s+runs$/i;

  const results = [];
  const collectSteps = (node) => {
    if (node.steps) {
      for (const step of node.steps) {
        const stepText = `${step.keyword}${step.text}`.trim();
        const match = stepText.match(pattern);
        if (match) {
          results.push({
            line: stepText,
            percent: Number(match[1]),
            runs: Number(match[2])
          });
        }
      }
    }
    if (node.children) {
      node.children.forEach(collectSteps);
    }
  };
  if (ast.feature) {
    collectSteps(ast.feature);
  }
  return results;
}

function statisticalLikeLines(ast, language) {
  const pattern =
    language === 'es'
      ? /^(?:Entonces)\s+.+\s+debe\s+cumplir\s+.+\s+en\s+al\s+menos\s+.+%\s+de\s+.+\s+ejecuciones$/i
      : /^(?:Then)\s+.+\s+should\s+satisfy\s+.+\s+in\s+at\s+least\s+.+%\s+of\s+.+\s+runs$/i;

  const results = [];
  const collectSteps = (node) => {
    if (node.steps) {
      for (const step of node.steps) {
        const stepText = `${step.keyword}${step.text}`.trim();
        if (pattern.test(stepText)) {
          results.push(stepText);
        }
      }
    }
    if (node.children) {
      node.children.forEach(collectSteps);
    }
  };
  if (ast.feature) {
    collectSteps(ast.feature);
  }
  return results;
}

function adversarialDatasets(ast, language) {
  const pattern =
    language === 'es'
      ? /^(?:Dado)\s+el\s+dataset\s+adversarial\s+"([^"]+)"$/i
      : /^(?:Given)\s+the\s+adversarial\s+dataset\s+"([^"]+)"$/i;

  const results = [];
  const collectSteps = (node) => {
    if (node.steps) {
      for (const step of node.steps) {
        const stepText = `${step.keyword}${step.text}`.trim();
        const match = stepText.match(pattern);
        if (match) {
          results.push(match[1].trim());
        }
      }
    }
    if (node.children) {
      node.children.forEach(collectSteps);
    }
  };
  if (ast.feature) {
    collectSteps(ast.feature);
  }
  return results;
}

export function parseFeature(content, language) {
  const ast = parseGherkin(content, language);
  const rules = languageRules(language);
  const model = {
    languageLine: '',
    featureLines: [],
    scenarioLines: [],
    acceptanceLines: [],
    tags: []
  };

  const langComment = ast.comments.find((c) => c.text.toLowerCase().startsWith('# language:'));
  if (langComment) {
    model.languageLine = langComment.text;
  }

  if (ast.feature) {
    model.featureLines.push({
      line: ast.feature.line,
      text: `${ast.feature.keyword}: ${ast.feature.name}`
    });

    const collectTags = (node) => {
      if (node.tags) {
        for (const t of node.tags) {
          model.tags.push({ line: t.line, tag: t.name });
        }
      }
      if (node.children) {
        node.children.forEach(collectTags);
      }
    };
    collectTags(ast.feature);

    const collectScenarios = (node) => {
      if (node.type === 'Scenario') {
        model.scenarioLines.push({
          line: node.line,
          text: `${node.keyword}: ${node.name}`
        });
      }
      if (node.children) {
        node.children.forEach(collectScenarios);
      }
    };
    collectScenarios(ast.feature);
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (rules.acceptancePattern.test(trimmed)) {
      model.acceptanceLines.push({ line: i + 1, text: trimmed });
    }
  }

  return model;
}

export function hasRequiredParsedTag(model, tagName) {
  const prefix = `${tagName}:`;
  return model.tags.some(({ tag }) => tag.toLowerCase().startsWith(prefix.toLowerCase()) && tag.length > prefix.length);
}

export function hasRecommendedTag(model, content, tagName) {
  const name = requiredTagName(tagName);
  return hasRequiredParsedTag(model, name) || hasRequiredTag(content, name);
}

function parsedTagValue(model, content, tagName) {
  const prefix = `${requiredTagName(tagName).replace(/^@/, '')}:`;
  const fromModel = model.tags.find(({ tag }) => tag.toLowerCase().startsWith(`@${prefix.toLowerCase()}`));
  if (fromModel) {
    return fromModel.tag
      .slice(fromModel.tag.indexOf(':') + 1)
      .trim()
      .toLowerCase();
  }
  const match = content.match(new RegExp(`@${prefix}([^\\s@]+)`, 'i'));
  return match ? match[1].trim().toLowerCase() : '';
}

/**
 * @param {object} options
 * @param {boolean} [options.strictTags] - require @rf: and @id:
 * @param {object} [options.aiTestingConfig] - aiTesting block from config ({ enabled, requiredTechniques, optionalTechniques })
 */
export function validateFeatureContent(content, file, requiredTags, language, options = {}) {
  const errors = [];
  const rules = languageRules(language);
  const parsed = parseFeature(content, language);
  const featureLine = parsed.featureLines[0]?.text || findAnyLine(content, rules.featurePrefixes);
  const scenarioLine = parsed.scenarioLines[0]?.text || findAnyLine(content, rules.scenarioPrefixes);
  const languageLine = parsed.languageLine || findLine(content, '# language:');

  if (languageLine && !new RegExp(`#\\s*language:\\s*${rules.code}\\b`, 'i').test(languageLine)) {
    errors.push(`Feature declares a Gherkin language that does not match configured language "${rules.code}".`);
  }
  if (rules.code === 'es' && !languageLine) {
    errors.push('Spanish Gherkin files must declare "# language: es".');
  }
  if (parsed.featureLines.length !== 1)
    errors.push(`Expected exactly one Feature title, found ${parsed.featureLines.length}.`);
  if (parsed.scenarioLines.length !== 1) {
    errors.push(`Expected exactly one Scenario, found ${parsed.scenarioLines.length}.`);
  }
  if (parsed.acceptanceLines.length === 0) errors.push(`Missing ${rules.acceptanceLabel}.`);

  for (const tag of requiredTags.map(requiredTagName).filter(Boolean)) {
    if (!hasRequiredParsedTag(parsed, tag) && !hasRequiredTag(content, tag)) {
      errors.push(`Missing required tag value ${tag}:<value>`);
    }
  }

  const typeValue = parsedTagValue(parsed, content, 'type');
  if (typeValue && !GHERKIN_TYPE_VALUES.has(typeValue)) {
    errors.push(
      `Unrecognized @type:${typeValue}. Supported values: ${[...GHERKIN_TYPE_VALUES].sort().join(', ')}. ` +
        'Use non-Gherkin evidence types in ## Non-functional coverage for other quality attributes.'
    );
  }

  if (options.strictTags) {
    if (!hasRecommendedTag(parsed, content, 'rf')) {
      errors.push('Missing recommended tag @rf:<RF-ID> (required with --strict-tags).');
    }
    if (!hasRecommendedTag(parsed, content, 'id')) {
      errors.push('Missing recommended tag @id:<TC-ID> (required with --strict-tags).');
    }
  }

  if (scenarioLine && !rfPattern.test(scenarioLine)) {
    errors.push('Scenario title does not contain an RF-like ID.');
  }
  if (!rfPattern.test(path.basename(file))) {
    errors.push('Feature filename does not contain an RF-like ID.');
  }

  // AI-component tag validation
  const aiCfg = options.aiTestingConfig;
  const hasAiComponent = parsed.tags.some(({ tag }) => tag === '@ai-component');
  if (aiCfg?.enabled) {
    const allowedTechniques = new Set(
      [...(aiCfg.requiredTechniques || []), ...(aiCfg.optionalTechniques || [])]
        .map(normalizeTechniqueTag)
        .filter(Boolean)
    );
    const techniqueTags = parsed.tags
      .map(({ tag }) => tag)
      .filter((tag) => /^@technique:/i.test(tag))
      .map((tag) => normalizeTechniqueTag(tag.replace(/^@technique:/i, '')));
    if (hasAiComponent && techniqueTags.length === 0) {
      errors.push(
        'Scenario tagged @ai-component must include at least one @technique:<value> tag (see ai-testing.rules.md).'
      );
    }
    if (!hasAiComponent && techniqueTags.length > 0) {
      errors.push('@technique:<value> tag is only valid on scenarios tagged @ai-component.');
    }
    if (allowedTechniques.size > 0) {
      for (const technique of techniqueTags) {
        if (!allowedTechniques.has(technique)) {
          errors.push(`Unknown AI testing technique "${technique}" for @technique:<value>.`);
        }
      }
    }
  }

  const ast = parseGherkin(content, language);
  const statisticalMatches = statisticalAssertions(ast, rules.code);
  const statisticalLike = statisticalLikeLines(ast, rules.code);
  const malformedStatisticalCount = Math.max(0, statisticalLike.length - statisticalMatches.length);
  if (malformedStatisticalCount > 0) {
    errors.push('Statistical assertion must use integer P and N values in the documented P% of N runs pattern.');
  }
  if (statisticalMatches.length > 0 && !hasAiComponent) {
    errors.push('Statistical assertion steps are only valid in scenarios tagged @ai-component.');
  }
  for (const assertion of statisticalMatches) {
    if (assertion.percent < 1 || assertion.percent > 100) {
      errors.push(`Statistical assertion percentage P must be between 1 and 100; found ${assertion.percent}.`);
    }
    if (assertion.runs < 2) {
      errors.push(`Statistical assertion run count N must be at least 2; found ${assertion.runs}.`);
    }
    if (assertion.percent >= 95 && assertion.runs < 10) {
      errors.push('Statistical assertion with P >= 95 requires at least 10 runs.');
    }
  }

  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  for (const dataset of adversarialDatasets(ast, rules.code)) {
    const absoluteDataset = path.resolve(repoRoot, dataset);
    if (!isInside(repoRoot, absoluteDataset)) {
      errors.push(`Adversarial dataset path escapes the repository: ${dataset}`);
      continue;
    }
    if (!fs.existsSync(absoluteDataset)) {
      errors.push(`Adversarial dataset file not found: ${dataset}`);
    }
  }

  return {
    errors,
    ids: [
      ...new Set([
        ...idsFromText(path.basename(file, '.feature')),
        ...idsFromText(featureLine),
        ...idsFromText(scenarioLine)
      ])
    ].sort(),
    caseIds: [...new Set([...caseIdsFromText(path.basename(file, '.feature')), ...caseIdsFromTags(parsed)])].sort()
  };
}

export function duplicateCaseIdErrors(results, formatDuplicateMessage) {
  const byId = new Map();
  for (const result of results) {
    for (const id of result.caseIds || []) {
      const current = byId.get(id) || [];
      current.push(result.file);
      byId.set(id, current);
    }
  }

  const errors = [];
  for (const [id, files] of byId.entries()) {
    const uniqueFiles = [...new Set(files)];
    if (uniqueFiles.length > 1) {
      errors.push(formatDuplicateMessage(id, uniqueFiles));
    }
  }
  return errors;
}

export function duplicateIdErrors(results) {
  return duplicateCaseIdErrors(
    results,
    (id, files) => `Duplicate test case identifier ${id} appears in: ${files.join(', ')}`
  );
}
