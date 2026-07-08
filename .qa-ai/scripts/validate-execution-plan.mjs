#!/usr/bin/env node
export { validateExecutionPlan } from './lib/execution-plan.mjs';
import { validateExecutionPlan } from './lib/execution-plan.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-execution-plan.mjs [options]

Options:
  --path <file>    Override execution plan path
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
  if (!jsonMode) logHeader('QA AI execution plan validator');

  const result = await validateExecutionPlan(process.cwd(), {
    planPath: args.path,
    matrixPath: args.matrix,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Execution plan is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} execution plan validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
