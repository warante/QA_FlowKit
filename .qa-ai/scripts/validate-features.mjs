#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const rfPattern = /\bRF[-_ ]?[A-Z0-9]+\b/i;
const idPattern = /\b(?:RF|TC|TEST|QA)[-_ ]?[A-Z0-9]+\b/gi;
const caseIdPattern = /\b(?:TC|TEST|QA)[-_ ]?[A-Z0-9]+\b/gi;

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-features.mjs [options]

Options:
  --path <dir>   Override the configured feature root
  --gherkin-language <en|es> Override the configured Gherkin language
  --allow-empty  Return success when no .feature files exist
  --no-duplicates Skip cross-file duplicate ID validation
  --help         Show this help
`);
}

function requiredTagName(tag) {
  const normalized = String(tag).trim();
  if (!normalized) return '';
  const withPrefix = normalized.startsWith('@') ? normalized : `@${normalized}`;
  return withPrefix.replace(/:$/, '');
}

function findLine(content, prefix) {
  return content.split(/\r?\n/).find((line) => line.trim().toLowerCase().startsWith(prefix.toLowerCase())) || '';
}

function normalizeLanguage(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['es', 'esp', 'spa', 'spanish', 'espanol', 'espa\u00f1ol'].includes(normalized)) return 'es';
  return 'en';
}

function languageRules(language) {
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

function findAnyLine(content, prefixes) {
  for (const prefix of prefixes) {
    const line = findLine(content, prefix);
    if (line) return line;
  }
  return '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasRequiredTag(content, tagName) {
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(tagName)}:[^\\s]+`, 'm');
  return pattern.test(content);
}

function normalizeId(value) {
  return String(value || '').replace(/\s+/g, '-').toUpperCase();
}

function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

function caseIdsFromText(value) {
  return [...String(value || '').matchAll(caseIdPattern)].map((match) => normalizeId(match[0]));
}

function caseIdsFromTags(model) {
  const caseTagPattern = /^@(?:id|test|case|testrail):(.+)$/i;
  return model.tags
    .map(({ tag }) => tag.match(caseTagPattern)?.[1])
    .filter(Boolean)
    .map(normalizeId);
}

function parseFeature(content, language) {
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

function hasRequiredParsedTag(model, tagName) {
  const prefix = `${tagName}:`;
  return model.tags.some(({ tag }) => tag.toLowerCase().startsWith(prefix.toLowerCase()) && tag.length > prefix.length);
}

function validate(content, file, requiredTags, language) {
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
  if (parsed.featureLines.length !== 1) errors.push(`Expected exactly one Feature title, found ${parsed.featureLines.length}.`);
  if (parsed.scenarioLines.length !== 1) errors.push(`Expected exactly one Scenario, found ${parsed.scenarioLines.length}.`);
  if (parsed.acceptanceLines.length === 0) errors.push(`Missing ${rules.acceptanceLabel}.`);

  for (const tag of requiredTags.map(requiredTagName).filter(Boolean)) {
    if (!hasRequiredParsedTag(parsed, tag) && !hasRequiredTag(content, tag)) {
      errors.push(`Missing required tag value ${tag}:<value>`);
    }
  }

  if (featureLine && !rfPattern.test(featureLine)) errors.push('Feature title does not contain an RF-like ID.');
  if (scenarioLine && !rfPattern.test(scenarioLine)) errors.push('Scenario title does not contain an RF-like ID.');
  if (!rfPattern.test(path.basename(file))) errors.push('Feature filename does not contain an RF-like ID.');

  return {
    errors,
    ids: [...new Set([
      ...idsFromText(path.basename(file, '.feature')),
      ...idsFromText(featureLine),
      ...idsFromText(scenarioLine)
    ])].sort(),
    caseIds: [...new Set([
      ...caseIdsFromText(path.basename(file, '.feature')),
      ...caseIdsFromTags(parsed)
    ])].sort()
  };
}

function duplicateIdErrors(results) {
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
      errors.push(`Duplicate test case identifier ${id} appears in: ${uniqueFiles.map((file) => relativeTo(cwd, file)).join(', ')}`);
    }
  }
  return errors;
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI feature validator');
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = args.path || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const language = normalizeLanguage(args['gherkin-language'] || args.gherkinLanguage || args.gherkin || getConfigValue(configInfo.data, 'gherkin.language', 'en'));
  const requiredTags = getConfigValue(configInfo.data, 'gherkin.tags.required', ['priority', 'type', 'manual']);
  const tagNames = Array.isArray(requiredTags) && requiredTags.length > 0 ? requiredTags : ['priority', 'type', 'manual'];
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));

  if (files.length === 0) {
    console.log(`No .feature files found under ${featureRoot}.`);
    if (!args['allow-empty']) {
      console.log('\nFAILED - no feature files found. Pass --allow-empty when this is expected.');
      process.exit(1);
    }
    return;
  }

  let totalErrors = 0;
  const results = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const result = {
      file,
      ...validate(content, file, tagNames, language)
    };
    results.push(result);
    if (result.errors.length === 0) {
      console.log(`[PASS] ${relativeTo(cwd, file)}`);
    } else {
      totalErrors += result.errors.length;
      console.log(`[FAIL] ${relativeTo(cwd, file)}`);
      for (const error of result.errors) console.log(`  - ${error}`);
    }
  }

  if (!args['no-duplicates']) {
    const duplicateErrors = duplicateIdErrors(results);
    if (duplicateErrors.length > 0) {
      totalErrors += duplicateErrors.length;
      console.log('[FAIL] Duplicate identifier validation');
      for (const error of duplicateErrors) console.log(`  - ${error}`);
    }
  }

  if (totalErrors > 0) {
    console.log(`\nFAILED - ${totalErrors} validation errors.`);
    process.exit(1);
  }
  console.log('\nVALID - all feature files passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
