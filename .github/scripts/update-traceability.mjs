#!/usr/bin/env node
import {
  extractRFIdsFromPR,
  extractRFIdsFromCommit,
  getRecentCommits,
  getPRData,
  buildCIMetadata
} from './lib/ci-traceability.mjs';
import { parseMarkdownTable, normalizeColumn } from './lib/markdown-table.mjs';
import { functionalMatrixContent } from './lib/markdown-section.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  pathExists,
  readText,
  resolveRepoPath,
  logHeader,
  parseArgs
} from './lib/utils.mjs';
import { ARTIFACT_PATHS } from './lib/artifact-paths.mjs';
import { normalizeId } from './lib/gherkin-validate.mjs';
import fs from 'node:fs/promises';

const args = parseArgs(process.argv);
const cwd = process.cwd();

function printHelp() {
  console.log(`Usage: node .github/scripts/update-traceability.mjs [options]

Options:
  --pr <number>            Update from merged PR number
  --since <duration>       Analyze commits since duration (default: 7 days ago)
  --matrix-path <file>     Override traceability matrix path
  --output <file>          Write updated matrix to file (default: overwrite in place)
  --dry-run                Show what would be updated without modifying files
  --json                   Output structured JSON format
  --help                   Show this help

Updates traceability matrix with CI/CD metadata from PRs and commits.
`);
}

function parseTraceabilityMatrix(content) {
  const table = parseMarkdownTable(functionalMatrixContent(content), {
    label: 'Traceability matrix',
    requiredColumns: ['RF', 'Feature File', 'Test Management Case ID']
  });

  if (table.errors.length > 0) {
    return { rows: [], errors: table.errors, header: table.header };
  }

  const rows = [];
  for (const row of table.rows) {
    const rf = String(row.values[normalizeColumn('RF')] || '').trim();
    if (!rf) continue;

    rows.push({
      rfId: normalizeId(rf),
      values: row.values,
      line: row.line
    });
  }

  return { rows, errors: [], header: table.header };
}

function updateMatrixWithMetadata(content, updates) {
  const lines = content.split('\n');
  const updatedLines = [...lines];

  for (const update of updates) {
    if (update.lineIndex >= 0 && update.lineIndex < updatedLines.length) {
      const line = updatedLines[update.lineIndex];
      const cells = line.split('|').map((c) => c.trim());

      if (cells.length > 0) {
        const lastValidatedCol = cells.findIndex((c) => normalizeColumn(c) === 'last validated');
        const validatedByCol = cells.findIndex((c) => normalizeColumn(c) === 'validated by');

        if (lastValidatedCol >= 0 && lastValidatedCol < cells.length) {
          cells[lastValidatedCol] = update.lastValidated || '';
        }
        if (validatedByCol >= 0 && validatedByCol < cells.length) {
          cells[validatedByCol] = update.validatedBy || '';
        }

        updatedLines[update.lineIndex] = `| ${cells.slice(1, -1).join(' | ')} |`;
      }
    }
  }

  return updatedLines.join('\n');
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  const dryRun = Boolean(args['dry-run']);

  if (!jsonMode && !dryRun) {
    logHeader('QA AI CI/CD traceability update');
  }

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const matrixPath =
    args['matrix-path'] || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });

  if (!(await pathExists(matrixAbsPath))) {
    const error = `Traceability matrix not found at ${matrixPath}`;
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, error }, null, 2));
    } else {
      console.log(`[FAIL] ${error}`);
    }
    process.exit(1);
  }

  const matrixContent = await readText(matrixAbsPath);
  const { rows: matrixRows, errors: parseErrors } = parseTraceabilityMatrix(matrixContent);

  if (parseErrors.length > 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ ok: false, errors: parseErrors }, null, 2));
    } else {
      for (const err of parseErrors) console.log(`[FAIL] ${err}`);
    }
    process.exit(1);
  }

  const rfToLineIndex = new Map();
  for (const row of matrixRows) {
    rfToLineIndex.set(row.rfId, row.line - 1);
  }

  const updates = [];
  const rfIds = new Set();

  if (args.pr) {
    const { prData, errors } = getPRData(cwd, args.pr);
    if (errors.length > 0) {
      if (jsonMode) {
        console.log(JSON.stringify({ ok: false, errors }, null, 2));
      } else {
        for (const err of errors) console.log(`[FAIL] ${err}`);
      }
      process.exit(1);
    }

    const extractedRFs = extractRFIdsFromPR(prData);
    for (const rf of extractedRFs) {
      rfIds.add(rf);
    }

    const metadata = buildCIMetadata(extractedRFs, prData, null);

    for (const rf of extractedRFs) {
      const lineIndex = rfToLineIndex.get(rf);
      if (lineIndex !== undefined) {
        updates.push({
          rfId: rf,
          lineIndex,
          lastValidated: metadata.lastValidated,
          validatedBy: metadata.validatedBy.substring(0, 7),
          validationType: metadata.validationType,
          prNumber: metadata.prNumber
        });
      }
    }
  } else {
    const since = args.since || '7 days ago';
    const { commits, errors } = getRecentCommits(cwd, { since });

    if (errors.length > 0) {
      if (jsonMode) {
        console.log(JSON.stringify({ ok: false, errors }, null, 2));
      } else {
        for (const err of errors) console.log(`[FAIL] ${err}`);
      }
      process.exit(1);
    }

    for (const commit of commits) {
      const extractedRFs = extractRFIdsFromCommit(commit.message);
      for (const rf of extractedRFs) {
        rfIds.add(rf);
      }

      const metadata = buildCIMetadata(extractedRFs, null, commit);

      for (const rf of extractedRFs) {
        const lineIndex = rfToLineIndex.get(rf);
        if (lineIndex !== undefined) {
          updates.push({
            rfId: rf,
            lineIndex,
            lastValidated: metadata.lastValidated,
            validatedBy: metadata.validatedBy.substring(0, 7),
            validationType: metadata.validationType,
            commitMessage: metadata.commitMessage
          });
        }
      }
    }
  }

  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          rfIds: Array.from(rfIds),
          updates,
          dryRun,
          matrixPath
        },
        null,
        2
      )
    );
    return;
  }

  if (updates.length === 0) {
    console.log('[INFO] No RFs found in commits/PRs or no matching RFs in traceability matrix.');
    return;
  }

  console.log(`\nFound ${rfIds.size} RF(s) in ${args.pr ? 'PR' : 'commits'}:`);
  for (const rf of rfIds) {
    console.log(`  - ${rf}`);
  }

  console.log(`\nUpdates to apply: ${updates.length}`);
  for (const update of updates) {
    console.log(`  - ${update.rfId}: validated at ${update.lastValidated} by ${update.validatedBy}`);
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No changes made.');
    return;
  }

  const updatedContent = updateMatrixWithMetadata(matrixContent, updates);
  const outputPath = args.output || matrixAbsPath;
  await fs.writeFile(outputPath, updatedContent, 'utf8');

  console.log(`\n[PASS] Traceability matrix updated at ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
