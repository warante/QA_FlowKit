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
const writeClaimPattern = /\b(?:created|updated|deleted|synced|archived|subido|creado|actualizado|eliminado|sincronizado)\s+(?:in|to|from|en|a|de)\s+(?:testrail|zephyr|xray|jira)\b/i;

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-sync-plan.mjs [options]

Options:
  --path <file>     Override sync plan path
  --features <dir>  Override configured feature root
  --allow-empty     Return success when no .feature files exist
  --allow-missing   Return success when the sync plan is missing
  --help            Show this help
`);
}

function normalizeId(value) {
  return String(value || '').replace(/\s+/g, '-').toUpperCase();
}

function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

async function collectFeatureIds(featureRootPath) {
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const entries = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    entries.push({
      file,
      ids: [...new Set([...idsFromText(path.basename(file, '.feature')), ...idsFromText(content)])].sort()
    });
  }
  return entries;
}

async function validateMappingFile(config, errors) {
  const mappingFile = getConfigValue(config, 'testrail.mappingFile', '');
  if (!mappingFile) return;
  const mappingPath = resolveRepoPath(cwd, mappingFile, { label: 'test management mapping file' });
  if (!await pathExists(mappingPath)) return;
  try {
    const parsed = JSON.parse(await readText(mappingPath));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      errors.push(`${mappingFile} must contain a JSON object.`);
    }
  } catch (error) {
    errors.push(`${mappingFile} is not valid JSON: ${error.message}`);
  }
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI sync plan validator');
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = args.features || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const syncPlanPath = args.path || getConfigValue(configInfo.data, 'testrail.syncPlanPath', 'qa-ai-output/testrail-sync-plan.md');
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const syncPlanFilePath = resolveRepoPath(cwd, syncPlanPath, { label: 'sync plan' });
  const features = await collectFeatureIds(featureRootPath);

  if (features.length === 0) {
    console.log(`No .feature files found under ${featureRoot}.`);
    if (args['allow-empty']) return;
    console.log('\nFAILED - no feature files found. Pass --allow-empty when this is expected.');
    process.exit(1);
  }

  if (!await pathExists(syncPlanFilePath)) {
    console.log(`Sync plan not found at ${syncPlanPath}.`);
    if (args['allow-missing']) return;
    console.log('\nFAILED - create the sync plan or pass --allow-missing.');
    process.exit(1);
  }

  const content = await readText(syncPlanFilePath);
  const normalizedContent = normalizeId(content);
  const errors = [];

  if (writeClaimPattern.test(content)) {
    errors.push(`${syncPlanPath} appears to claim an external write happened; MVP sync plans must stay proposal-first.`);
  }
  if (!/\b(?:approval|approve|aprobaci[o\u00f3]n|aprobar)\b/i.test(content)) {
    errors.push(`${syncPlanPath} must mention required approval before external writes.`);
  }

  for (const feature of features) {
    for (const id of feature.ids) {
      if (!normalizedContent.includes(id)) {
        errors.push(`${relativeTo(cwd, feature.file)} identifier ${id} is missing from ${syncPlanPath}.`);
      }
    }
  }

  await validateMappingFile(configInfo.data, errors);

  if (errors.length > 0) {
    for (const error of errors) console.log(`[FAIL] ${error}`);
    console.log(`\nFAILED - ${errors.length} sync plan validation error(s).`);
    process.exit(1);
  }

  console.log(`[PASS] ${syncPlanPath} is proposal-first and covers ${features.length} feature file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
