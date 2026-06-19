#!/usr/bin/env node
import path from 'node:path';
import { validateConfigFile } from './lib/config-schema.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';

const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-config.mjs [options]

Options:
  --config <path>  Config file to validate (default qa-ai.config.yaml)
  --json           Print machine-readable JSON
  --help           Show this help

Validates qa-ai.config.yaml against .qa-ai/contracts/config.v1.schema.json.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const configPath = args.config
    ? path.resolve(process.cwd(), String(args.config))
    : path.join(process.cwd(), 'qa-ai.config.yaml');
  const result = await validateConfigFile(process.cwd(), configPath);

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logHeader('QA FlowKit config validator');
    if (result.ok) {
      console.log('[PASS] qa-ai.config.yaml is valid.');
    } else {
      for (const error of result.errors) console.log(`[FAIL] ${error}`);
    }
  }

  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
