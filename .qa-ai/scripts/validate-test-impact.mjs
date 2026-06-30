#!/usr/bin/env node
export { validateTestImpact } from './lib/test-impact-validate.mjs';
import { validateTestImpact } from './lib/test-impact-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-test-impact.mjs [options]

Options:
  --path <file>       Override traceability matrix path
  --report <file>     Override test impact report file path
  --allow-missing     Return success when test impact report is missing
  --json              Output structured JSON format
  --help              Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI governed test impact analysis validator');

  const result = await validateTestImpact(process.cwd(), {
    matrixPath: args.path,
    reportPath: args.report,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Test impact analysis is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} test impact validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
