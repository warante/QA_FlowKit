#!/usr/bin/env node
export { validateTestDataPlan } from './lib/test-data-plan.mjs';
import { validateTestDataPlan } from './lib/test-data-plan.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-test-data-plan.mjs [options]

Options:
  --path <file>     Override test data plan artifact path
  --matrix <file>   Override traceability matrix path
  --allow-missing   Return success when test data plan is missing
  --json            Output structured JSON format
  --help            Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI test data plan validator');

  const result = await validateTestDataPlan(process.cwd(), {
    planPath: args.path,
    matrixPath: args.matrix,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Test data plan is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} test data plan validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
