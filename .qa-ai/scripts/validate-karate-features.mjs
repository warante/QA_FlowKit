#!/usr/bin/env node
import { validateKarateFeatures } from './lib/karate-features-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import {
  finishSkippedValidator,
  finishValidatorRun,
  isJsonMode,
  runValidatorMain,
  validatorOptionsFromArgs
} from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-karate-features.mjs [options]

Validates executable Karate .feature files under automation.api/ui specsPath when Karate is configured.
QA design features under gherkin.featurePath use validate-features.mjs instead.

Options:
  --path <dir>     Validate a single root (must be under configured Karate paths)
  --file <path>    Validate a single Karate feature file
  --allow-empty    Success when no Karate .feature files exist
  --strict-rf      Require @rf: tags
  --no-duplicates  Skip cross-file @id duplicate check
  --json           Print machine-readable JSON only
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
  if (!jsonMode) logHeader('QA AI Karate feature validator');

  const result = await validateKarateFeatures(process.cwd(), validatorOptionsFromArgs(args));

  if (result.skipped) {
    finishSkippedValidator({
      jsonMode,
      message: 'Karate is not configured (automation.api.framework or automation.ui.framework is not karate). Skipping.'
    });
    return;
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '\nVALID - all Karate feature files passed.',
    failureMessage: `\nFAILED - ${result.errors.length} Karate validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
