#!/usr/bin/env node
export { validateHealingLog } from './lib/healing-log-validate.mjs';
import { validateHealingLog } from './lib/healing-log-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-healing-log.mjs [options]

Options:
  --path <file>       Override traceability matrix path
  --log <file>        Override healing log file path
  --allow-missing     Return success when healing log is missing
  --json              Output structured JSON format
  --help              Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI governed healing log validator');

  const result = await validateHealingLog(process.cwd(), {
    matrixPath: args.path,
    logPath: args.log,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Healing log is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} healing log validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
