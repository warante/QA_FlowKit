import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { normalizeMappingEntries } from './test-management-mapping.mjs';
import { getTestManagementMappingFile } from './test-management-config.mjs';
import { getActiveRunId } from './harness-run-store.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  pathExists,
  readText,
  resolveRepoPath,
  resolveTestManagementSyncPlanPath
} from './utils.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';
import { toFindings } from './validator-api.mjs';

function parseSnapshotTimestamp(content) {
  const match = content.match(/Capture Timestamp:\s*(.+)/i);
  if (!match) return null;
  const tsStr = match[1].trim();
  const date = new Date(tsStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], findings?: object[] }>}
 */
export async function validateSyncDiff(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const diffPath =
    options.diffPath || getConfigValue(config, 'testManagementSync.diffPath', ARTIFACT_PATHS.testManagementSyncDiff);
  const snapshotPath =
    options.snapshotPath ||
    getConfigValue(config, 'testManagementSync.remoteSnapshotPath', ARTIFACT_PATHS.testManagementRemoteSnapshot);
  const resolvedSyncPlan = options.planPath
    ? {
        path: options.planPath,
        absPath: resolveRepoPath(cwd, options.planPath, { label: 'sync plan' })
      }
    : await resolveTestManagementSyncPlanPath(cwd, config);
  const mappingPath = options.mappingPath || getTestManagementMappingFile(config);

  const absDiff = resolveRepoPath(cwd, diffPath, { label: 'sync diff' });
  const absSnapshot = resolveRepoPath(cwd, snapshotPath, { label: 'remote snapshot' });
  const absPlan = resolvedSyncPlan.absPath;
  const absMapping = resolveRepoPath(cwd, mappingPath, { label: 'mapping file' });

  const allowMissing = Boolean(options.allowMissing);
  const errors = [];

  const diffExists = await pathExists(absDiff);
  const snapshotExists = await pathExists(absSnapshot);

  if (!diffExists || !snapshotExists) {
    if (allowMissing) {
      return { ok: true, errors: [], warnings: [], skipped: true, findings: [] };
    }
    if (!diffExists) errors.push(`Sync diff file not found at ${diffPath}`);
    if (!snapshotExists) errors.push(`Remote snapshot file not found at ${snapshotPath}`);
    return { ok: false, errors, warnings: [], findings: toFindings({ errors }) };
  }

  const diffContent = await readText(absDiff);
  const snapshotContent = await readText(absSnapshot);

  const snapshotTable = parseMarkdownTable(snapshotContent, {
    label: 'Remote snapshot table',
    requiredColumns: ['External ID', 'Title', 'Section/Suite', 'Status', 'Hash']
  });
  errors.push(...snapshotTable.errors.map((e) => `Snapshot: ${e}`));

  const diffTable = parseMarkdownTable(diffContent, {
    label: 'Sync diff table',
    requiredColumns: ['ID', 'External ID', 'Field changes', 'Idempotency key']
  });

  const diffNormalizedHeader = diffTable.header.map(normalizeColumn);
  const actionColIndex = diffNormalizedHeader.findIndex((h) => h === 'action' || h === 'action (create/update/skip)');
  if (actionColIndex === -1) {
    errors.push('Sync diff table is missing required column "Action" or "Action (create/update/skip)".');
  }
  errors.push(...diffTable.errors.map((e) => `Diff: ${e}`));

  let mapping = [];
  if (await pathExists(absMapping)) {
    try {
      mapping = normalizeMappingEntries(JSON.parse(await readText(absMapping)), mappingPath, errors);
    } catch (error) {
      errors.push(`Mapping file ${mappingPath} is not valid JSON: ${error.message}`);
    }
  }

  const planIds = new Set();
  if (await pathExists(absPlan)) {
    const planContent = await readText(absPlan);
    const planTable = parseMarkdownTable(planContent, {
      label: 'Sync plan table',
      requiredColumns: ['ID', 'Proposed action', 'Approval status']
    });
    for (const row of planTable.rows) {
      const idVal = String(row.values[normalizeColumn('ID')] || '')
        .trim()
        .toUpperCase();
      if (idVal) planIds.add(idVal);
    }
  }

  const mappingIdempotencyKeys = new Set(mapping.map((m) => m.idempotencyKey).filter(Boolean));
  const mappingExternalIds = new Set(
    mapping
      .map((m) => m.externalId)
      .filter(Boolean)
      .map((externalId) => String(externalId))
  );
  const diffIdempotencyKeys = new Set();

  if (diffTable.rows.length === 0 && diffTable.errors.length === 0) {
    errors.push('Sync diff table must contain at least one row.');
  }

  const actionColName = actionColIndex !== -1 ? diffTable.header[actionColIndex] : null;

  for (const row of diffTable.rows) {
    const id = String(row.values[normalizeColumn('ID')] || '')
      .trim()
      .toUpperCase();
    const action = String(row.values[normalizeColumn(actionColName)] || '')
      .trim()
      .toLowerCase();
    const externalId = String(row.values[normalizeColumn('External ID')] || '').trim();
    const idempotencyKey = String(row.values[normalizeColumn('Idempotency key')] || '').trim();

    if (id && !planIds.has(id)) {
      errors.push(`Line ${row.line}: ID "${id}" in sync diff is not present in the approved sync plan.`);
    }

    if (action === 'delete') {
      errors.push(`Line ${row.line}: delete action is not supported.`);
    } else if (action && !['create', 'update', 'skip'].includes(action)) {
      errors.push(`Line ${row.line}: invalid action "${action}", expected create, update, or skip.`);
    }

    if (action === 'create') {
      if (!idempotencyKey) {
        errors.push(`Line ${row.line}: create action is missing an idempotency key.`);
      } else {
        if (mappingIdempotencyKeys.has(idempotencyKey)) {
          errors.push(`Line ${row.line}: idempotency key "${idempotencyKey}" already exists in mapping file.`);
        }
        if (diffIdempotencyKeys.has(idempotencyKey)) {
          errors.push(`Line ${row.line}: duplicate idempotency key "${idempotencyKey}" inside sync diff.`);
        }
        diffIdempotencyKeys.add(idempotencyKey);
      }
    }

    if (action === 'update') {
      if (!externalId) {
        errors.push(`Line ${row.line}: update action is missing external ID.`);
      } else if (!mappingExternalIds.has(externalId)) {
        errors.push(`Line ${row.line}: external ID "${externalId}" does not exist in mapping file.`);
      }
    }
  }

  const snapshotTime = parseSnapshotTimestamp(snapshotContent);
  if (!snapshotTime) {
    errors.push('Snapshot is missing a valid ISO-8601 Capture Timestamp.');
  } else {
    try {
      const runId = await getActiveRunId(cwd);
      if (runId) {
        const eventsFile = path.join(cwd, '.qa-ai/state/runs', runId, 'events.jsonl');
        if (await pathExists(eventsFile)) {
          const eventsText = await fs.readFile(eventsFile, 'utf8');
          const lines = eventsText.split('\n').filter((l) => l.trim());
          let approvalTime = null;
          for (const line of lines) {
            try {
              const ev = JSON.parse(line);
              if (ev.type === 'approval.recorded' && ev.gate === 'external-write:test-management') {
                approvalTime = ev.timestamp;
              }
            } catch {
              // ignore malformed lines
            }
          }
          if (approvalTime) {
            const appDate = new Date(approvalTime);
            if (snapshotTime <= appDate) {
              errors.push(
                `Snapshot Capture Timestamp (${snapshotTime.toISOString()}) must be newer than the sync plan approval time (${appDate.toISOString()}).`
              );
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Unable to read harness run-store for snapshot approval check: ${error.message}`);
    }
  }

  const ok = errors.length === 0;
  return { ok, errors, warnings: [], findings: ok ? [] : toFindings({ errors }) };
}
