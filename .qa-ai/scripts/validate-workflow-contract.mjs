#!/usr/bin/env node
export { validateWorkflowContractFile as validateWorkflowContract } from './lib/workflow-contract-validate.mjs';
import { validateWorkflowContractFile as validateWorkflowContract } from './lib/workflow-contract-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-workflow-contract.mjs [options]

Options:
  --json   Print machine-readable JSON
  --help   Show this help

Validates .qa-ai/contracts/workflow.v1.json for schema, safe paths and allowlisted validators.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  const result = await validateWorkflowContract(process.cwd());

  if (!jsonMode) logHeader('Workflow contract validator');

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings || [],
    jsonMode,
    successMessage: '[PASS] Workflow contract is valid.',
    failureMessage: `\nFAILED - ${result.errors.length} workflow contract validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
