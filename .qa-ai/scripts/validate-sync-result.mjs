#!/usr/bin/env node
import { normalizeColumn, parseMarkdownTable } from './lib/markdown-table.mjs';
import { normalizeMappingEntries } from './lib/test-management-mapping.mjs';
import { getTestManagementMappingFile } from './lib/test-management-config.mjs';
import { getActiveRunId } from './lib/harness-run-store.mjs';
import {
  getConfigValue,
  isIsoDateString,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-sync-result.mjs [options]

Options:
  --diff-path <file>          Override sync diff path
  --apply-log-path <file>     Override apply log path
  --pre-snapshot-path <file>  Override pre-apply remote snapshot path
  --post-snapshot-path <file> Override post-apply remote snapshot path
  --rollback-path <file>      Override rollback plan path
  --mapping-path <file>       Override mapping file path
  --allow-missing             Return success if artifacts are missing
  --json                      Print machine-readable JSON only
  --help                      Show this help
`);
}

const isValidIsoDate = isIsoDateString;

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
    logHeader('QA AI sync result validator');
  }

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const diffPath =
    args['diff-path'] ||
    getConfigValue(config, 'testManagementSync.diffPath', 'qa-ai-output/test-management-sync-diff.md');
  const applyLogPath =
    args['apply-log-path'] ||
    getConfigValue(config, 'testManagementSync.applyLogPath', 'qa-ai-output/test-management-apply-log.md');
  const rollbackPath =
    args['rollback-path'] ||
    getConfigValue(config, 'testManagementSync.rollbackPath', 'qa-ai-output/test-management-rollback-plan.md');
  const mappingPath =
    args['mapping-path'] || getTestManagementMappingFile(config);

  const configSnapshotPath = getConfigValue(
    config,
    'testManagementSync.remoteSnapshotPath',
    'qa-ai-output/test-management-remote-snapshot.md'
  );

  const preSnapshotPath = args['pre-snapshot-path'] || 'qa-ai-output/test-management-remote-snapshot.pre.md';
  const postSnapshotPath = args['post-snapshot-path'] || 'qa-ai-output/test-management-remote-snapshot.post.md';

  const defaultPre = resolveRepoPath(cwd, preSnapshotPath, { label: 'pre-apply snapshot' });
  const defaultPost = resolveRepoPath(cwd, postSnapshotPath, { label: 'post-apply snapshot' });
  const absConfigSnapshot = resolveRepoPath(cwd, configSnapshotPath, { label: 'config snapshot' });

  let absPre = defaultPre;
  let absPost = defaultPost;

  const preExistsDefault = await pathExists(defaultPre);
  const postExistsDefault = await pathExists(defaultPost);

  if (!args['pre-snapshot-path'] && !preExistsDefault) {
    const fallbackPre = resolveRepoPath(cwd, 'qa-ai-output/test-management-remote-snapshot.pre-apply.md', {
      label: 'pre-apply fallback'
    });
    if (await pathExists(fallbackPre)) {
      absPre = fallbackPre;
    } else if (await pathExists(absConfigSnapshot)) {
      absPre = absConfigSnapshot;
    }
  }

  if (!args['post-snapshot-path'] && !postExistsDefault) {
    const fallbackPost = resolveRepoPath(cwd, 'qa-ai-output/test-management-remote-snapshot.post-apply.md', {
      label: 'post-apply fallback'
    });
    if (await pathExists(fallbackPost)) {
      absPost = fallbackPost;
    } else if (await pathExists(absConfigSnapshot)) {
      absPost = absConfigSnapshot;
    }
  }

  const absDiff = resolveRepoPath(cwd, diffPath, { label: 'sync diff' });
  const absApplyLog = resolveRepoPath(cwd, applyLogPath, { label: 'apply log' });
  const absRollback = resolveRepoPath(cwd, rollbackPath, { label: 'rollback plan' });
  const absMapping = resolveRepoPath(cwd, mappingPath, { label: 'mapping file' });

  const allowMissing = Boolean(args['allow-missing']);
  const errors = [];

  const diffExists = await pathExists(absDiff);
  const applyLogExists = await pathExists(absApplyLog);
  const preSnapshotExists = await pathExists(absPre);
  const postSnapshotExists = await pathExists(absPost);
  const rollbackExists = await pathExists(absRollback);

  if (!diffExists || !applyLogExists || !preSnapshotExists || !postSnapshotExists || !rollbackExists) {
    if (allowMissing) {
      if (jsonMode) {
        console.log(JSON.stringify({ ok: true, errors: [], warnings: [] }));
      } else {
        console.log('Skipping sync result validation (missing artifacts under --allow-missing).');
      }
      process.exit(0);
    }

    if (!diffExists) errors.push(`Sync diff file not found at ${diffPath}`);
    if (!applyLogExists) errors.push(`Apply log file not found at ${applyLogPath}`);
    if (!preSnapshotExists) errors.push(`Pre-apply snapshot file not found at ${preSnapshotPath}`);
    if (!postSnapshotExists) errors.push(`Post-apply snapshot file not found at ${postSnapshotPath}`);
    if (!rollbackExists) errors.push(`Rollback plan file not found at ${rollbackPath}`);

    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors, findings: toFindings(errors) }));
    } else {
      for (const err of errors) console.error(`[FAIL] ${err}`);
    }
    process.exit(1);
  }

  // Load Run ID to check mapping updates
  let runId = null;
  try {
    runId = await getActiveRunId(cwd);
  } catch {
    // ignore run-store read errors
  }

  // Read content
  const diffContent = await readText(absDiff);
  const applyLogContent = await readText(absApplyLog);
  const preSnapshotContent = await readText(absPre);
  const postSnapshotContent = await readText(absPost);
  const rollbackContent = await readText(absRollback);

  // Parse tables
  const diffTable = parseMarkdownTable(diffContent, {
    label: 'Sync diff table',
    requiredColumns: ['ID', 'External ID', 'Field changes', 'Idempotency key']
  });
  const diffNormalizedHeader = diffTable.header.map(normalizeColumn);
  const diffActionColIndex = diffNormalizedHeader.findIndex(
    (h) => h === 'action' || h === 'action (create/update/skip)'
  );
  if (diffActionColIndex === -1) {
    errors.push('Sync diff table is missing required column "Action" or "Action (create/update/skip)".');
  }
  errors.push(...diffTable.errors.map((e) => `Diff: ${e}`));

  const applyTable = parseMarkdownTable(applyLogContent, {
    label: 'Apply log table',
    requiredColumns: ['ID', 'Action', 'External ID', 'Timestamp']
  });
  const applyNormalizedHeader = applyTable.header.map(normalizeColumn);
  const applyResultColIndex = applyNormalizedHeader.findIndex(
    (h) => h === 'result' || h === 'result (applied/failed/skipped)'
  );
  if (applyResultColIndex === -1) {
    errors.push('Apply log table is missing required column "Result" or "Result (applied/failed/skipped)".');
  }
  errors.push(...applyTable.errors.map((e) => `Apply log: ${e}`));

  const preSnapshotTable = parseMarkdownTable(preSnapshotContent, {
    label: 'Pre-apply remote snapshot table',
    requiredColumns: ['External ID', 'Title', 'Section/Suite', 'Status', 'Hash']
  });
  errors.push(...preSnapshotTable.errors.map((e) => `Pre-snapshot: ${e}`));

  const postSnapshotTable = parseMarkdownTable(postSnapshotContent, {
    label: 'Post-apply remote snapshot table',
    requiredColumns: ['External ID', 'Title', 'Section/Suite', 'Status', 'Hash']
  });
  errors.push(...postSnapshotTable.errors.map((e) => `Post-snapshot: ${e}`));

  const rollbackTable = parseMarkdownTable(rollbackContent, {
    label: 'Rollback plan table',
    requiredColumns: ['ID', 'Action', 'External ID', 'Rollback action', 'Rollback details', 'Status']
  });
  errors.push(...rollbackTable.errors.map((e) => `Rollback plan: ${e}`));

  // Parse mapping file
  let mapping = [];
  if (await pathExists(absMapping)) {
    try {
      mapping = normalizeMappingEntries(JSON.parse(await readText(absMapping)), mappingPath, errors);
    } catch (e) {
      errors.push(`Mapping file ${mappingPath} is not valid JSON: ${e.message}`);
    }
  }

  if (errors.length > 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors, findings: toFindings(errors) }));
    } else {
      for (const err of errors) console.error(`[FAIL] ${err}`);
    }
    process.exit(1);
  }

  // Helpers to fetch values
  const getDiffRowValue = (row, colNormalizedName) => {
    if (colNormalizedName === 'action') {
      const colName = diffActionColIndex !== -1 ? diffTable.header[diffActionColIndex] : null;
      return String(row.values[normalizeColumn(colName)] || '')
        .trim()
        .toLowerCase();
    }
    return String(row.values[normalizeColumn(colNormalizedName)] || '').trim();
  };

  const getApplyRowValue = (row, colNormalizedName) => {
    if (colNormalizedName === 'result') {
      const colName = applyResultColIndex !== -1 ? applyTable.header[applyResultColIndex] : null;
      return String(row.values[normalizeColumn(colName)] || '')
        .trim()
        .toLowerCase();
    }
    return String(row.values[normalizeColumn(colNormalizedName)] || '').trim();
  };

  // 1. Every diff row appears in the apply log exactly once, and no extra rows are in the apply log
  const diffIds = new Set();
  const diffRowMap = new Map();
  for (const row of diffTable.rows) {
    const id = getDiffRowValue(row, 'id').toUpperCase();
    if (id) {
      diffIds.add(id);
      diffRowMap.set(id, row);
    }
  }

  const applyIds = new Set();
  const applyRowMap = new Map();
  const applyCounts = new Map();

  for (const row of applyTable.rows) {
    const id = getApplyRowValue(row, 'id').toUpperCase();
    if (!id) continue;

    applyCounts.set(id, (applyCounts.get(id) || 0) + 1);
    applyRowMap.set(id, row);
    applyIds.add(id);

    if (!diffIds.has(id)) {
      errors.push(`Apply Log: ID "${id}" is present in apply log but missing from sync diff.`);
    }
  }

  for (const id of diffIds) {
    if (!applyIds.has(id)) {
      errors.push(`Apply Log: ID "${id}" is present in sync diff but missing from apply log.`);
    }
    const count = applyCounts.get(id) || 0;
    if (count > 1) {
      errors.push(`Apply Log: ID "${id}" appears multiple times (${count}) in apply log.`);
    }
  }

  // Pre-index snapshots for easy lookup by External ID
  const preSnapshotMap = new Map();
  for (const row of preSnapshotTable.rows) {
    const extId = String(row.values[normalizeColumn('External ID')] || '').trim();
    if (extId) preSnapshotMap.set(extId, row);
  }

  const postSnapshotMap = new Map();
  for (const row of postSnapshotTable.rows) {
    const extId = String(row.values[normalizeColumn('External ID')] || '').trim();
    if (extId) postSnapshotMap.set(extId, row);
  }

  // Pre-index rollback plan by ID
  const rollbackRowMap = new Map();
  for (const row of rollbackTable.rows) {
    const id = String(row.values[normalizeColumn('ID')] || '')
      .trim()
      .toUpperCase();
    if (id) rollbackRowMap.set(id, row);
  }

  // 2. Core validations for each apply-log row
  for (const row of applyTable.rows) {
    const id = getApplyRowValue(row, 'id').toUpperCase();
    if (!id) continue;

    const diffRow = diffRowMap.get(id);
    if (!diffRow) continue; // already caught by extra row check

    const action = getDiffRowValue(diffRow, 'action');
    const result = getApplyRowValue(row, 'result');

    if (result && !['applied', 'failed', 'skipped'].includes(result)) {
      errors.push(`Apply Log: ID "${id}" has invalid result "${result}", expected applied, failed, or skipped.`);
      continue;
    }

    // Skip verification if action in diff is skip
    if (action === 'skip') continue;

    // Check failed status propagation to rollback plan
    if (result === 'failed') {
      const rollbackRow = rollbackRowMap.get(id);
      if (!rollbackRow) {
        errors.push(`Rollback Plan: failed action for ID "${id}" has no corresponding row in the rollback plan.`);
      } else {
        const rollbackStatus = String(rollbackRow.values[normalizeColumn('Status')] || '')
          .trim()
          .toLowerCase();
        if (rollbackStatus !== 'failed') {
          errors.push(
            `Rollback Plan: ID "${id}" failed in apply log, but rollback plan status is "${rollbackStatus}", expected "failed".`
          );
        }
      }
      continue;
    }

    if (result === 'applied') {
      if (action === 'create') {
        const idempotencyKey = getDiffRowValue(diffRow, 'idempotency key');
        const mappingEntry = mapping.find((m) => m.idempotencyKey === idempotencyKey);

        if (!mappingEntry) {
          errors.push(
            `Mapping File: applied create for ID "${id}" (idempotency key "${idempotencyKey}") is missing from the mapping file.`
          );
        } else {
          // Check mapping fields
          const mappedExtId = String(mappingEntry.externalId || '').trim();
          if (!mappedExtId) {
            errors.push(`Mapping File: ID "${id}" mapping entry is missing "externalId".`);
          } else {
            // Verify it is present in post-apply snapshot
            if (!postSnapshotMap.has(mappedExtId)) {
              errors.push(
                `Post-Apply Snapshot: newly created case for ID "${id}" (external ID "${mappedExtId}") was not found in the post-apply snapshot.`
              );
            }
          }

          if (!isValidIsoDate(mappingEntry.lastAppliedAt)) {
            errors.push(`Mapping File: ID "${id}" mapping entry has invalid or missing "lastAppliedAt".`);
          }
          if (!mappingEntry.lastAppliedRunId) {
            errors.push(`Mapping File: ID "${id}" mapping entry is missing "lastAppliedRunId".`);
          } else if (runId && mappingEntry.lastAppliedRunId !== runId) {
            errors.push(
              `Mapping File: ID "${id}" mapping entry "lastAppliedRunId" is "${mappingEntry.lastAppliedRunId}", expected active run ID "${runId}".`
            );
          }
        }
      }

      if (action === 'update') {
        const diffExtId = getDiffRowValue(diffRow, 'external id');
        const mappingEntry = mapping.find((m) => String(m.externalId) === diffExtId);

        if (!mappingEntry) {
          errors.push(
            `Mapping File: applied update for ID "${id}" (external ID "${diffExtId}") is missing from the mapping file.`
          );
        } else {
          if (!isValidIsoDate(mappingEntry.lastAppliedAt)) {
            errors.push(`Mapping File: ID "${id}" mapping entry has invalid or missing "lastAppliedAt".`);
          }
          if (!mappingEntry.lastAppliedRunId) {
            errors.push(`Mapping File: ID "${id}" mapping entry is missing "lastAppliedRunId".`);
          } else if (runId && mappingEntry.lastAppliedRunId !== runId) {
            errors.push(
              `Mapping File: ID "${id}" mapping entry "lastAppliedRunId" is "${mappingEntry.lastAppliedRunId}", expected active run ID "${runId}".`
            );
          }
        }

        // Verify pre and post snapshot differences
        const preRow = preSnapshotMap.get(diffExtId);
        const postRow = postSnapshotMap.get(diffExtId);

        if (!preRow) {
          errors.push(
            `Pre-Apply Snapshot: external ID "${diffExtId}" (for updated ID "${id}") is missing from pre-apply snapshot.`
          );
        }
        if (!postRow) {
          errors.push(
            `Post-Apply Snapshot: external ID "${diffExtId}" (for updated ID "${id}") is missing from post-apply snapshot.`
          );
        }

        if (preRow && postRow && absPre !== absPost) {
          const preHash = String(preRow.values[normalizeColumn('Hash')] || '').trim();
          const postHash = String(postRow.values[normalizeColumn('Hash')] || '').trim();
          if (preHash === postHash) {
            errors.push(
              `Post-Apply Snapshot: hash for updated ID "${id}" (external ID "${diffExtId}") did not change between pre-apply and post-apply snapshots.`
            );
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors, findings: toFindings(errors) }));
    } else {
      for (const err of errors) console.error(`[FAIL] ${err}`);
      console.error(`\nFAILED - ${errors.length} sync result validation error(s).`);
    }
    process.exit(1);
  }

  if (jsonMode) {
    console.log(JSON.stringify({ ok: true, errors: [], findings: [] }));
  } else {
    console.log('[PASS] Sync results and mapping file pass all verification checks.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
