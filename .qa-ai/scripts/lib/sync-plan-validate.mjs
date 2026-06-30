import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { idsFromText, normalizeId } from './id-normalize.mjs';
import { duplicateRowIds } from './duplicate-row-ids.mjs';
import { validateTestManagementMapping } from './test-management-mapping.mjs';
import { getTestManagementMappingFile } from './test-management-config.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath,
  resolveTestManagementSyncPlanPath
} from './utils.mjs';

const writeClaimPattern =
  /\b(?:created|updated|deleted|synced|archived|creado|actualizado|eliminado|sincronizado|archivado)\s+(?:in|to|from|en|a|de)\s+(?:testrail|zephyr|xray|jira)\b/i;
const requiredColumns = ['ID', 'Proposed action', 'Approval status'];
const proposalPattern =
  /\b(?:propose|proposed|proposal|pending|review|approve|approval|required|draft|plan|planned|proponer|propuesto|pendiente|revisar|aprobar|aprobaci[o\u00f3]n|requerida|borrador|planificado)\b/i;
const approvalPattern =
  /\b(?:approval|approve|pending approval|requires approval|aprobaci[o\u00f3]n|aprobar|pendiente|requiere aprobaci[o\u00f3]n)\b/i;

export function parseSyncPlanTable(content) {
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

export function duplicatePlanErrors(rows) {
  return duplicateRowIds(rows, {
    formatMessage: (id, lines) => `Identifier ${id} appears in multiple sync plan rows: ${lines.join(', ')}.`
  });
}

export async function collectFeatureIds(featureRootPath) {
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const entries = [];
  for (const file of files) {
    const content = await readText(file);
    entries.push({
      file,
      ids: [...new Set([...idsFromText(path.basename(file, '.feature')), ...idsFromText(content)])].sort()
    });
  }
  return entries;
}

async function validateMappingFile(cwd, config, errors) {
  const mappingFile = getTestManagementMappingFile(config);
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

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], legacyWarning?: string }>}
 */
export async function validateSyncPlan(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = options.features || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const resolvedSyncPlan = options.path
    ? { path: options.path, absPath: resolveRepoPath(cwd, options.path, { label: 'sync plan' }), isLegacy: false }
    : await resolveTestManagementSyncPlanPath(cwd, configInfo.data);
  const syncPlanPath = resolvedSyncPlan.path;
  const legacyWarning = resolvedSyncPlan.isLegacy
    ? `Legacy sync plan path '${resolvedSyncPlan.path}' found. Rename it to '${resolvedSyncPlan.replacementPath}' to follow current conventions.`
    : '';
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const syncPlanFilePath = resolvedSyncPlan.absPath;
  const features = await collectFeatureIds(featureRootPath);

  if (features.length === 0) {
    if (options.allowEmpty) return { ok: true, errors: [], warnings: [], legacyWarning };
    return {
      ok: false,
      errors: [`No .feature files found under ${featureRoot}.`],
      warnings: [],
      legacyWarning
    };
  }

  if (!(await pathExists(syncPlanFilePath))) {
    if (options.allowMissing) return { ok: true, errors: [], warnings: [], legacyWarning };
    return {
      ok: false,
      errors: [`Sync plan not found at ${syncPlanPath}.`],
      warnings: [],
      legacyWarning
    };
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

  await validateMappingFile(cwd, configInfo.data, errors);

  return { ok: errors.length === 0, errors, warnings: [], legacyWarning };
}
