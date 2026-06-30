#!/usr/bin/env node
import { validateDesignFeatures } from './lib/gherkin-features-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import {
  finishSkippedValidator,
  finishValidatorRun,
  isJsonMode,
  runValidatorMain,
  validatorOptionsFromArgs
} from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-features.mjs [options]

Options:
  --path <dir>   Override the configured feature root
  --file <path>  Validate a single feature file
  --gherkin-language <en|es> Override the configured Gherkin language
  --allow-empty  Return success when no .feature files exist
  --no-duplicates Skip cross-file duplicate ID validation
  --strict-tags  Require recommended @rf: and @id: tags
  --strict-layout  Treat folder placement warnings as errors
  --json         Print machine-readable JSON only
  --help         Show this help

Validates QA design .feature files under gherkin.featurePath only.
For executable Karate features, use validate-karate-features.mjs.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI feature validator');

  const result = await validateDesignFeatures(process.cwd(), validatorOptionsFromArgs(args));

  if (result.skipped) {
    finishSkippedValidator({ jsonMode, message: result.skipMessage });
    return;
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '\nVALID - all feature files passed.',
    failureMessage: `\nFAILED - ${result.errors.length} validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
