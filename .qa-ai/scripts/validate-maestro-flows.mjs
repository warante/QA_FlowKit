#!/usr/bin/env node
import { validateMaestroFlowsCollection } from './lib/maestro-flows-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import {
  finishSkippedValidator,
  finishValidatorRun,
  isJsonMode,
  runValidatorMain,
  validatorOptionsFromArgs
} from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-maestro-flows.mjs [options]

Options:
  --path <dir>     Override automation.mobile.flowsPath
  --file <path>    Validate a single Maestro flow file
  --allow-empty    Return success when no Maestro YAML flows exist
  --json           Print machine-readable JSON only
  --help           Show this help

Validates Maestro flow front matter, sequence commands and repository-local runFlow references.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI Maestro flow validator');

  const result = await validateMaestroFlowsCollection(process.cwd(), validatorOptionsFromArgs(args));

  if (result.skipped) {
    finishSkippedValidator({
      jsonMode,
      message: 'Maestro is not configured (automation.mobile.framework is not maestro). Skipping.'
    });
    return;
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '\nVALID - all Maestro flows passed.',
    failureMessage: `\nFAILED - ${result.errors.length} Maestro validation issue(s).`
  });
}

runValidatorMain(import.meta.url, main);
