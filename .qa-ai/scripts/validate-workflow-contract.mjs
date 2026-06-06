#!/usr/bin/env node
import { validateWorkflowContract } from './lib/harness-contract.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';

const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-workflow-contract.mjs [options]

Options:
  --json   Print machine-readable JSON
  --help   Show this help

Validates .qa-ai/contracts/workflow.v1.json for schema, safe paths and allowlisted validators.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const result = await validateWorkflowContract(process.cwd());

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logHeader('Workflow contract validator');
  }

  if (!args.json) {
    if (result.ok) {
      console.log('[PASS] Workflow contract is valid.');
    } else {
      for (const error of result.errors) {
        console.log(`[FAIL] ${error}`);
      }
    }
  }

  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
