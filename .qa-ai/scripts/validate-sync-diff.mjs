#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './lib/markdown-table.mjs';
import { normalizeMappingEntries } from './lib/test-management-mapping.mjs';
import { getActiveRunId } from './lib/harness-run-store.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath,
  resolveTestManagementSyncPlanPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-sync-diff.mjs [options]

Options:
  --diff-path <file>      Override sync diff path
  --snapshot-path <file>  Override remote snapshot path
  --plan-path <file>      Override sync plan path
  --mapping-path <file>   Override mapping file path
  --allow-missing         Return success if artifacts are missing
  --json                  Print machine-readable JSON only
  --help                  Show this help
`);
}

function parseSnapshotTimestamp(content) {
  const match = content.match(/Capture Timestamp:\s*(.+)/i);
  if (!match) return null;
  const tsStr = match[1].trim();
  const date = new Date(tsStr);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toFindings(errors) {
  return errors.map((message) => ({ severity: 'error', message }));
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI sync diff validator');
  }

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const diffPath =
    args['diff-path'] ||
    getConfigValue(config, 'testManagementSync.diffPath', 'qa-ai-output/test-management-sync-diff.md');
  const snapshotPath =
    args['snapshot-path'] ||
    getConfigValue(config, 'testManagementSync.remoteSnapshotPath', 'qa-ai-output/test-management-remote-snapshot.md');
  const resolvedSyncPlan = args['plan-path']
    ? {
        path: args['plan-path'],
        absPath: resolveRepoPath(cwd, args['plan-path'], { label: 'sync plan' })
      }
    : await resolveTestManagementSyncPlanPath(cwd, config);
  const mappingPath =
    args['mapping-path'] || getConfigValue(config, 'testrail.mappingFile', 'qa-ai-output/test-management-mapping.json');

  const absDiff = resolveRepoPath(cwd, diffPath, { label: 'sync diff' });
  const absSnapshot = resolveRepoPath(cwd, snapshotPath, { label: 'remote snapshot' });
  const absPlan = resolvedSyncPlan.absPath;
  const absMapping = resolveRepoPath(cwd, mappingPath, { label: 'mapping file' });

  const allowMissing = Boolean(args['allow-missing']);
  const errors = [];

  const diffExists = await pathExists(absDiff);
  const snapshotExists = await pathExists(absSnapshot);

  if (!diffExists || !snapshotExists) {
    if (allowMissing) {
      if (jsonMode) {
        console.log(JSON.stringify({ ok: true, errors: [], warnings: [] }));
      } else {
        console.log('Skipping sync diff validation (missing artifacts under --allow-missing).');
      }
      process.exit(0);
    }
    if (!diffExists) errors.push(`Sync diff file not found at ${diffPath}`);
    if (!snapshotExists) errors.push(`Remote snapshot file not found at ${snapshotPath}`);

    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors, findings: toFindings(errors) }));
    } else {
      for (const err of errors) console.error(`[FAIL] ${err}`);
    }
    process.exit(1);
  }

  // Read diff and snapshot
  const diffContent = await readText(absDiff);
  const snapshotContent = await readText(absSnapshot);

  // 1. Validate snapshot headers and table
  const snapshotTable = parseMarkdownTable(snapshotContent, {
    label: 'Remote snapshot table',
    requiredColumns: ['External ID', 'Title', 'Section/Suite', 'Status', 'Hash']
  });
  errors.push(...snapshotTable.errors.map((e) => `Snapshot: ${e}`));

  // 2. Validate diff headers and table
  // Accept 'Action' or 'Action (create/update/skip)'
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

  // 3. Read mapping file
  let mapping = [];
  if (await pathExists(absMapping)) {
    try {
      mapping = normalizeMappingEntries(JSON.parse(await readText(absMapping)), mappingPath, errors);
    } catch (e) {
      errors.push(`Mapping file ${mappingPath} is not valid JSON: ${e.message}`);
    }
  }

  // 4. Read sync plan to check IDs
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

  // Collect existing mapping keys and IDs
  const mappingIdempotencyKeys = new Set(mapping.map((m) => m.idempotencyKey).filter(Boolean));
  const mappingExternalIds = new Set(
    mapping
      .map((m) => m.externalId)
      .filter(Boolean)
      .map((externalId) => String(externalId))
  );

  // Trace unique idempotency keys in diff itself to prevent duplicate creations in same run
  const diffIdempotencyKeys = new Set();

  // Validate diff rows
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

    // ID must exist in approved sync plan
    if (id && !planIds.has(id)) {
      errors.push(`Line ${row.line}: ID "${id}" in sync diff is not present in the approved sync plan.`);
    }

    // Action checks
    if (action === 'delete') {
      errors.push(`Line ${row.line}: delete action is not supported.`);
    } else if (action && !['create', 'update', 'skip'].includes(action)) {
      errors.push(`Line ${row.line}: invalid action "${action}", expected create, update, or skip.`);
    }

    // Create action validation
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

    // Update action validation
    if (action === 'update') {
      if (!externalId) {
        errors.push(`Line ${row.line}: update action is missing external ID.`);
      } else if (!mappingExternalIds.has(externalId)) {
        errors.push(`Line ${row.line}: external ID "${externalId}" does not exist in mapping file.`);
      }
    }
  }

  // 5. Validate snapshot capture timestamp relationship
  const snapshotTime = parseSnapshotTimestamp(snapshotContent);
  if (!snapshotTime) {
    errors.push('Snapshot is missing a valid ISO-8601 Capture Timestamp.');
  } else {
    // If active run exists, check if capture timestamp is newer than latest sync-plan approval event
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
    } catch {
      // ignore run-store read errors
    }
  }

  if (errors.length > 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors, findings: toFindings(errors) }));
    } else {
      for (const err of errors) console.error(`[FAIL] ${err}`);
      console.error(`\nFAILED - ${errors.length} sync diff validation error(s).`);
    }
    process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify({ ok: true, errors: [], findings: [] }));
  } else {
    console.log('[PASS] Sync diff and remote snapshot pass all validation checks.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
