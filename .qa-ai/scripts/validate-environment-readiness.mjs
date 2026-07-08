#!/usr/bin/env node
export { validateEnvironmentReadiness } from './lib/environment-readiness.mjs';
import { validateEnvironmentReadiness } from './lib/environment-readiness.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-environment-readiness.mjs [options]

Options:
  --path <file>    Override artifact path
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
  if (!jsonMode) logHeader('QA AI environment readiness validator');

  const result = await validateEnvironmentReadiness(process.cwd(), {
    readinessPath: args.path,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Environment readiness is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} environment readiness validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
