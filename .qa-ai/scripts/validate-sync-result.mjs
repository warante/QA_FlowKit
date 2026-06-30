#!/usr/bin/env node
export { validateSyncResult } from './lib/sync-result-validate.mjs';
import { validateSyncResult } from './lib/sync-result-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

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

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI sync result validator');

  const result = await validateSyncResult(process.cwd(), {
    diffPath: args['diff-path'],
    applyLogPath: args['apply-log-path'],
    preSnapshotPath: args['pre-snapshot-path'],
    postSnapshotPath: args['post-snapshot-path'],
    rollbackPath: args['rollback-path'],
    mappingPath: args['mapping-path'],
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Sync results and mapping file pass all verification checks.',
    failureMessage: `\nFAILED - ${result.errors.length} sync result validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
