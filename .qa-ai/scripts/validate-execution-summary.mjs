#!/usr/bin/env node
export { validateExecutionSummary } from './lib/execution-summary.mjs';
import { validateExecutionSummary } from './lib/execution-summary.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-execution-summary.mjs [options]

Options:
  --path <file>    Override execution summary path
  --matrix <file>  Override traceability matrix path
  --allow-missing  Return success when artifact is missing
  --json           Output structured JSON format
  --help           Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI execution summary validator');

  const result = await validateExecutionSummary(process.cwd(), {
    summaryPath: args.path,
    matrixPath: args.matrix,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Execution summary is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} execution summary validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
