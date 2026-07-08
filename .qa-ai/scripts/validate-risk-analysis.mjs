#!/usr/bin/env node
export { validateRiskAnalysis } from './lib/risk-analysis.mjs';
import { validateRiskAnalysis } from './lib/risk-analysis.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-risk-analysis.mjs [options]

Options:
  --path <file>         Override risk analysis artifact path
  --requirements <file> Override normalized requirements path
  --allow-missing       Return success when risk analysis is missing
  --json                Output structured JSON format
  --help                Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI risk analysis validator');

  const result = await validateRiskAnalysis(process.cwd(), {
    analysisPath: args.path,
    requirementsPath: args.requirements,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Risk analysis is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} risk analysis validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
