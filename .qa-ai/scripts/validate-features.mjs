#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  parseArgs,
  relativeTo,
  logHeader
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const rfPattern = /\bRF[-_ ]?[A-Z0-9]+(?:[-_][A-Z0-9]+)*\b/i;

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-features.mjs [options]

Options:
  --path <dir>   Override the configured feature root
  --help         Show this help
`);
}

function requiredTagToken(tag) {
  const normalized = String(tag).trim();
  if (!normalized) return '';
  const withPrefix = normalized.startsWith('@') ? normalized : `@${normalized}`;
  return withPrefix.endsWith(':') ? withPrefix : `${withPrefix}:`;
}

function findLine(content, prefix) {
  return content.split(/\r?\n/).find((line) => line.trim().toLowerCase().startsWith(prefix.toLowerCase())) || '';
}

function validate(content, file, requiredTags) {
  const errors = [];
  const scenarios = content.match(/^\s*Scenario(?: Outline)?:/gmi) || [];
  const featureLine = findLine(content, 'Feature:');
  const scenarioLine = findLine(content, 'Scenario:') || findLine(content, 'Scenario Outline:');
  const languageLine = findLine(content, '# language:');

  if (languageLine && !/#\s*language:\s*en\b/i.test(languageLine)) {
    errors.push('Feature declares a non-English Gherkin language.');
  }
  if (!featureLine) errors.push('Missing Feature title.');
  if (scenarios.length !== 1) errors.push(`Expected exactly one Scenario, found ${scenarios.length}.`);
  if (!/^\s*Acceptance Criteria:/gmi.test(content)) errors.push('Missing Acceptance Criteria.');

  for (const tag of requiredTags.map(requiredTagToken).filter(Boolean)) {
    if (!content.includes(tag)) errors.push(`Missing required tag ${tag}`);
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
  const requiredTags = getConfigValue(configInfo.data, 'gherkin.tags.required', ['priority', 'type', 'manual']);
  const tagNames = Array.isArray(requiredTags) && requiredTags.length > 0 ? requiredTags : ['priority', 'type', 'manual'];
  const featureRootPath = path.join(cwd, featureRoot);
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));

  if (files.length === 0) {
    console.log(`No .feature files found under ${featureRoot}.`);
    return;
  }

  let totalErrors = 0;
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const errors = validate(content, file, tagNames);
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
