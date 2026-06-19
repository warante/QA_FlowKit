#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './lib/markdown-table.mjs';
import { validateTestManagementMapping } from './lib/test-management-mapping.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath,
  resolveTestManagementSyncPlanPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const idPattern = /\b(?:RF|TC|TEST|QA)(?:[-_][A-Z0-9]+| \d[A-Z0-9]*|\d+)\b/gi;
const writeClaimPattern =
  /\b(?:created|updated|deleted|synced|archived|creado|actualizado|eliminado|sincronizado|archivado)\s+(?:in|to|from|en|a|de)\s+(?:testrail|zephyr|xray|jira)\b/i;
const requiredColumns = ['ID', 'Proposed action', 'Approval status'];
const proposalPattern =
  /\b(?:propose|proposed|proposal|pending|review|approve|approval|required|draft|plan|planned|proponer|propuesto|pendiente|revisar|aprobar|aprobaci[o\u00f3]n|requerida|borrador|planificado)\b/i;
const approvalPattern =
  /\b(?:approval|approve|pending approval|requires approval|aprobaci[o\u00f3]n|aprobar|pendiente|requiere aprobaci[o\u00f3]n)\b/i;

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-sync-plan.mjs [options]

Options:
  --path <file>     Override sync plan path
  --features <dir>  Override configured feature root
  --allow-empty     Return success when no .feature files exist
  --allow-missing   Return success when the sync plan is missing
  --help            Show this help

Validates proposal-first language, feature identifier coverage, sync-plan table shape and duplicate plan IDs.
`);
}

function normalizeId(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

function parseSyncPlanTable(content) {
  const table = parseMarkdownTable(content, {
    label: 'Sync plan table',
    requiredColumns
  });
  const errors = [...table.errors];
  const rows = [];
  for (const row of table.rows) {
    const ids = [...new Set(idsFromText(row.cells.join(' ')))].sort();
    const proposedAction = row.values[normalizeColumn('Proposed action')] || '';
    const approvalStatus = row.values[normalizeColumn('Approval status')] || '';

    if (ids.length === 0) errors.push(`Line ${row.line}: row must include at least one RF/test identifier.`);
    if (proposedAction && !proposalPattern.test(proposedAction)) {
      errors.push(`Line ${row.line}: proposed action must stay proposal-first.`);
    }
    if (approvalStatus && !approvalPattern.test(approvalStatus)) {
      errors.push(`Line ${row.line}: approval status must clearly require or wait for approval.`);
    }
    if (writeClaimPattern.test(row.cells.join(' '))) {
      errors.push(
        `Line ${row.line}: row appears to claim an external write happened; sync plans must stay proposal-first.`
      );
    }

    rows.push({ ...row, ids });
  }

  return { errors, rows, header: table.header };
}

function duplicatePlanErrors(rows) {
  const byId = new Map();
  const errors = [];

  for (const row of rows) {
    for (const id of row.ids) {
      const current = byId.get(id) || [];
      current.push(row.line);
      byId.set(id, current);
    }
  }

  for (const [id, lines] of byId.entries()) {
    if (lines.length > 1) errors.push(`Identifier ${id} appears in multiple sync plan rows: ${lines.join(', ')}.`);
  }

  return errors;
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
  if (!(await pathExists(mappingPath))) return;
  try {
    const parsed = JSON.parse(await readText(mappingPath));
    errors.push(...validateTestManagementMapping(parsed, { source: mappingFile }));
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
  const resolvedSyncPlan = args.path
    ? { path: args.path, absPath: resolveRepoPath(cwd, args.path, { label: 'sync plan' }), isLegacy: false }
    : await resolveTestManagementSyncPlanPath(cwd, configInfo.data);
  const syncPlanPath = resolvedSyncPlan.path;
  if (resolvedSyncPlan.isLegacy) {
    console.warn(
      `[WARN] Legacy sync plan path '${resolvedSyncPlan.path}' found. Rename it to '${resolvedSyncPlan.replacementPath}' to follow current conventions.`
    );
  }
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const syncPlanFilePath = resolvedSyncPlan.absPath;
  const features = await collectFeatureIds(featureRootPath);

  if (features.length === 0) {
    console.log(`No .feature files found under ${featureRoot}.`);
    if (args['allow-empty']) return;
    console.log('\nFAILED - no feature files found. Pass --allow-empty when this is expected.');
    process.exit(1);
  }

  if (!(await pathExists(syncPlanFilePath))) {
    console.log(`Sync plan not found at ${syncPlanPath}.`);
    if (args['allow-missing']) return;
    console.log('\nFAILED - create the sync plan or pass --allow-missing.');
    process.exit(1);
  }

  const content = await readText(syncPlanFilePath);
  const normalizedContent = normalizeId(content);
  const syncPlan = parseSyncPlanTable(content);
  const errors = [];
  errors.push(...syncPlan.errors);
  errors.push(...duplicatePlanErrors(syncPlan.rows));

  if (writeClaimPattern.test(content)) {
    errors.push(
      `${syncPlanPath} appears to claim an external write happened; MVP sync plans must stay proposal-first.`
    );
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
