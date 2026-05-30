/**
 * Gherkin feature file parsing and validation (dependency-free).
 */
import path from 'node:path';

export const rfPattern = /\bRF[-_ ]?[A-Z0-9]+\b/i;
export const idPattern = /\b(?:RF|TC|TEST|QA)[-_ ]?[A-Z0-9]+\b/gi;
export const caseIdPattern = /\b(?:TC|TEST|QA)[-_ ]?[A-Z0-9]+\b/gi;

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
  return 'en';
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

export function parseFeature(content, language) {
  const rules = languageRules(language);
  const model = {
    languageLine: '',
    featureLines: [],
    scenarioLines: [],
    acceptanceLines: [],
    tags: []
  };

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed) continue;
    const line = index + 1;

    if (trimmed.toLowerCase().startsWith('# language:')) {
      model.languageLine = trimmed;
      continue;
    }
    if (trimmed.startsWith('@')) {
      for (const tag of trimmed.split(/\s+/).filter(Boolean)) model.tags.push({ line, tag });
      continue;
    }
    if (rules.featurePattern.test(trimmed)) {
      model.featureLines.push({ line, text: trimmed });
      continue;
    }
    if (rules.scenarioPattern.test(trimmed)) {
      model.scenarioLines.push({ line, text: trimmed });
      continue;
    }
    if (rules.acceptancePattern.test(trimmed)) {
      model.acceptanceLines.push({ line, text: trimmed });
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

/**
 * @param {object} options
 * @param {boolean} [options.strictTags] - require @rf: and @id:
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

export function duplicateIdErrors(results) {
  const byId = new Map();
  for (const result of results) {
    for (const id of result.caseIds) {
      const current = byId.get(id) || [];
      current.push(result.file);
      byId.set(id, current);
    }
  }

  const errors = [];
  for (const [id, files] of byId.entries()) {
    const uniqueFiles = [...new Set(files)];
    if (uniqueFiles.length > 1) {
      errors.push(`Duplicate test case identifier ${id} appears in: ${uniqueFiles.join(', ')}`);
    }
  }
  return errors;
}
