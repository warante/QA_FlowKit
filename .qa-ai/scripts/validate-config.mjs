#!/usr/bin/env node
import { validateConfig } from './lib/config-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { isJsonMode, runValidatorMain, validatorOptionsFromArgs } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-config.mjs [options]

Options:
  --config <path>   Config file to validate (default qa-ai.config.yaml)
  --allow-missing   Return success when the config file is missing
  --json            Print machine-readable JSON
  --help            Show this help

Validates qa-ai.config.yaml against .qa-ai/contracts/config.v1.schema.json.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  const options = validatorOptionsFromArgs(args);
  const result = await validateConfig(process.cwd(), options);

  if (jsonMode) {
    console.log(JSON.stringify(result.skipped ? { ok: true, skipped: true, errors: [] } : result, null, 2));
  } else {
    logHeader('QA FlowKit config validator');
    if (result.skipped) {
      console.log('Skipping config validation (missing qa-ai.config.yaml under --allow-missing).');
    } else if (result.ok) {
      console.log('[PASS] qa-ai.config.yaml is valid.');
    } else {
      for (const error of result.errors) console.log(`[FAIL] ${error}`);
    }
  }

  if (!result.ok) process.exit(1);
}

runValidatorMain(import.meta.url, main);
