#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const idPattern = /\b(?:RF|TC|TEST|QA)[-_ ]?[A-Z0-9]+\b/gi;

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-traceability.mjs [options]

Options:
  --path <file>     Override configured traceability matrix path
  --features <dir>  Override configured feature root
  --allow-empty     Return success when no .feature files exist
  --allow-missing   Return success when the traceability matrix is missing
  --help            Show this help
`);
}

function normalizeId(value) {
  return String(value || '').replace(/\s+/g, '-').toUpperCase();
}

function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

async function featureIds(featureRootPath) {
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const entries = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const ids = new Set([
      ...idsFromText(path.basename(file, '.feature')),
      ...idsFromText(content)
    ]);
    entries.push({
      file,
      ids: [...ids].sort()
    });
  }
  return entries;
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI traceability validator');
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = args.features || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const matrixPath = args.path || getConfigValue(configInfo.data, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const matrixFilePath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  const features = await featureIds(featureRootPath);

  if (features.length === 0) {
    console.log(`No .feature files found under ${featureRoot}.`);
    if (args['allow-empty']) return;
    console.log('\nFAILED - no feature files found. Pass --allow-empty when this is expected.');
    process.exit(1);
  }

  if (!await pathExists(matrixFilePath)) {
    console.log(`Traceability matrix not found at ${matrixPath}.`);
    if (args['allow-missing']) return;
    console.log('\nFAILED - create the traceability matrix or pass --allow-missing.');
    process.exit(1);
  }

  const matrixContent = normalizeId(await readText(matrixFilePath));
  const errors = [];
  for (const feature of features) {
    if (feature.ids.length === 0) {
      errors.push(`${relativeTo(cwd, feature.file)} has no RF/test identifiers to trace.`);
      continue;
    }
    for (const id of feature.ids) {
      if (!matrixContent.includes(id)) {
        errors.push(`${relativeTo(cwd, feature.file)} identifier ${id} is missing from ${matrixPath}.`);
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.log(`[FAIL] ${error}`);
    console.log(`\nFAILED - ${errors.length} traceability validation error(s).`);
    process.exit(1);
  }

  console.log(`[PASS] ${matrixPath} covers identifiers from ${features.length} feature file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
