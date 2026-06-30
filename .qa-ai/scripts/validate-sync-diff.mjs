#!/usr/bin/env node
export { validateSyncDiff } from './lib/sync-diff-validate.mjs';
import { validateSyncDiff } from './lib/sync-diff-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

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

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI sync diff validator');

  const result = await validateSyncDiff(process.cwd(), {
    diffPath: args['diff-path'],
    snapshotPath: args['snapshot-path'],
    planPath: args['plan-path'],
    mappingPath: args['mapping-path'],
    allowMissing: Boolean(args['allow-missing'])
  });

  if (result.skipped) {
    if (jsonMode) {
      finishValidatorRun({ ok: true, jsonMode: true, extraJson: { skipped: true } });
      return;
    }
    console.log('Skipping sync diff validation (missing artifacts under --allow-missing).');
    return;
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Sync diff and remote snapshot pass all validation checks.',
    extraJson: jsonMode ? { findings: result.findings || [] } : {}
  });
}

runValidatorMain(import.meta.url, main);
