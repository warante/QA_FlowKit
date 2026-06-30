#!/usr/bin/env node
export { validateExternalIntake } from './lib/external-intake-validate.mjs';
import { validateExternalIntake } from './lib/external-intake-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorFindingsRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-external-intake.mjs [options]

Options:
  --requirements-path <file>  Override imported requirements path
  --cases-path <file>         Override imported cases path
  --rf-pattern <pattern>      Override RF ID pattern (safe form: PREFIX-\\\\d+, default: RF-\\\\d+)
  --allow-missing             Return success if artifacts are missing
  --strict                    Treat injection-scan findings as errors
  --json                      Print machine-readable JSON only
  --help                      Show this help

Validates imported-requirements.md and imported-cases.md:
  - Required table columns and non-empty values
  - Unique RF IDs (requirements) and External IDs (cases)
  - ISO 8601 timestamps
  - RF ID format against configured pattern
  - Injection scan on all imported text (findings are warnings; --strict turns them into errors)
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI external intake validator');

  const result = await validateExternalIntake(process.cwd(), {
    requirementsPath: args['requirements-path'],
    casesPath: args['cases-path'],
    rfPattern: args['rf-pattern'],
    allowMissing: Boolean(args['allow-missing']),
    strict: Boolean(args.strict)
  });

  if (result.skipped) {
    if (jsonMode) {
      finishValidatorFindingsRun({
        ok: true,
        warnings: [],
        findings: [],
        jsonMode: true,
        extraJson: { skipped: true }
      });
      return;
    }
    console.log('Skipping external intake validation (sources.external.enabled is false and artifacts absent).');
    return;
  }

  if (result.ok && args['allow-missing'] && !jsonMode) {
    console.log('Skipping external intake validation (missing artifacts under --allow-missing).');
    return;
  }

  finishValidatorFindingsRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    findings: result.findings,
    jsonMode,
    successMessage:
      result.warnings.length > 0
        ? `\n[PASS] External intake artifacts valid (${result.warnings.length} warning(s)).`
        : '[PASS] External intake artifacts pass all validation checks.',
    failureMessage: `\nFAILED - ${result.errors.length} external intake validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
