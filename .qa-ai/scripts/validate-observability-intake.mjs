#!/usr/bin/env node
export { validateObservabilityIntake } from './lib/observability-intake.mjs';
import { validateObservabilityIntake } from './lib/observability-intake.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-observability-intake.mjs [options]

Options:
  --path <file>    Override intake path
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
  if (!jsonMode) logHeader('QA AI observability intake validator');

  const result = await validateObservabilityIntake(process.cwd(), {
    intakePath: args.path,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Observability intake is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} observability intake validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
