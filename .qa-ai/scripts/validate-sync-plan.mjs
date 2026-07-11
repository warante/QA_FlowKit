#!/usr/bin/env node
export { validateSyncPlan } from './lib/sync-plan-validate.mjs';
import { validateSyncPlan } from './lib/sync-plan-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-sync-plan.mjs [options]

Options:
  --path <file>     Override sync plan path
  --features <dir>  Override configured feature root
  --allow-empty     Return success when no .feature files exist
  --allow-missing   Return success when the sync plan is missing
  --json            Print machine-readable JSON only
  --help            Show this help

Validates proposal-first language, feature identifier coverage, sync-plan table shape and duplicate plan IDs.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI sync plan validator');

  const result = await validateSyncPlan(process.cwd(), {
    path: args.path,
    features: args.features,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing'])
  });

  if (result.ok && args['allow-empty'] && result.errors.length === 0 && !jsonMode) {
    console.log('No .feature files found under configured feature root.');
    return;
  }
  if (result.ok && args['allow-missing'] && result.errors.length === 0 && !jsonMode) {
    console.log('Sync plan not found (allowed under --allow-missing).');
    return;
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: `[PASS] Sync plan is proposal-first and covers feature files.`,
    failureMessage: result.errors.length
      ? `\nFAILED - ${result.errors.length} sync plan validation error(s).`
      : undefined
  });
}

runValidatorMain(import.meta.url, main);
