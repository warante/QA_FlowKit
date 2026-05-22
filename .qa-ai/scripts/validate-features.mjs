#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  parseArgs,
  relativeTo,
  resolveRepoPath,
  logHeader
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const rfPattern = /\bRF[-_ ]?[A-Z0-9]+(?:[-_][A-Z0-9]+)*\b/i;

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-features.mjs [options]

Options:
  --path <dir>   Override the configured feature root
  --gherkin-language <en|es> Override the configured Gherkin language
  --allow-empty  Return success when no .feature files exist
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
  if (['es', 'esp', 'spa', 'spanish', 'espanol', 'español'].includes(normalized)) return 'es';
  return 'en';
}

function languageRules(language) {
  if (language === 'es') {
    return {
      code: 'es',
      featurePattern: /^\s*(?:Característica|Caracteristica):/gmi,
      scenarioPattern: /^\s*(?:Escenario|Esquema del escenario):/gmi,
      featurePrefixes: ['Característica:', 'Caracteristica:'],
      scenarioPrefixes: ['Escenario:', 'Esquema del escenario:'],
      acceptancePattern: /^\s*Criterios de aceptación:/gmi,
      acceptanceLabel: 'Criterios de aceptación'
    };
  }
  return {
    code: 'en',
    featurePattern: /^\s*Feature:/gmi,
    scenarioPattern: /^\s*Scenario(?: Outline)?:/gmi,
    featurePrefixes: ['Feature:'],
    scenarioPrefixes: ['Scenario:', 'Scenario Outline:'],
    acceptancePattern: /^\s*Acceptance Criteria:/gmi,
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

function validate(content, file, requiredTags, language) {
  const errors = [];
  const rules = languageRules(language);
  const scenarios = content.match(rules.scenarioPattern) || [];
  const featureLine = findAnyLine(content, rules.featurePrefixes);
  const scenarioLine = findAnyLine(content, rules.scenarioPrefixes);
  const languageLine = findLine(content, '# language:');

  if (languageLine && !new RegExp(`#\\s*language:\\s*${rules.code}\\b`, 'i').test(languageLine)) {
    errors.push(`Feature declares a Gherkin language that does not match configured language "${rules.code}".`);
  }
  if (rules.code === 'es' && !languageLine) {
    errors.push('Spanish Gherkin files must declare "# language: es".');
  }
  if (!featureLine) errors.push('Missing Feature title.');
  if (scenarios.length !== 1) errors.push(`Expected exactly one Scenario, found ${scenarios.length}.`);
  if (!rules.acceptancePattern.test(content)) errors.push(`Missing ${rules.acceptanceLabel}.`);

  for (const tag of requiredTags.map(requiredTagName).filter(Boolean)) {
    if (!hasRequiredTag(content, tag)) errors.push(`Missing required tag value ${tag}:<value>`);
  }

  if (featureLine && !rfPattern.test(featureLine)) errors.push('Feature title does not contain an RF-like ID.');
  if (scenarioLine && !rfPattern.test(scenarioLine)) errors.push('Scenario title does not contain an RF-like ID.');
  if (!rfPattern.test(path.basename(file))) errors.push('Feature filename does not contain an RF-like ID.');

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
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const errors = validate(content, file, tagNames, language);
    if (errors.length === 0) {
      console.log(`[PASS] ${relativeTo(cwd, file)}`);
    } else {
      totalErrors += errors.length;
      console.log(`[FAIL] ${relativeTo(cwd, file)}`);
      for (const error of errors) console.log(`  - ${error}`);
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
