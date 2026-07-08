#!/usr/bin/env node
export { validateResultAnalysis } from './lib/result-analysis.mjs';
import { validateResultAnalysis } from './lib/result-analysis.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-result-analysis.mjs [options]

Options:
  --path <file>    Override result analysis path
  --summary <file> Override execution summary path
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
  if (!jsonMode) logHeader('QA AI result analysis validator');

  const result = await validateResultAnalysis(process.cwd(), {
    analysisPath: args.path,
    summaryPath: args.summary,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Result analysis is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} result analysis validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
