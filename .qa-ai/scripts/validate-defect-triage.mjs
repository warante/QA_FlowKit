#!/usr/bin/env node
export { validateDefectTriage } from './lib/defect-triage.mjs';
import { validateDefectTriage } from './lib/defect-triage.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-defect-triage.mjs [options]

Options:
  --path <file>    Override defect triage path
  --analysis <file> Override result analysis path
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
  if (!jsonMode) logHeader('QA AI defect triage validator');

  const result = await validateDefectTriage(process.cwd(), {
    triagePath: args.path,
    analysisPath: args.analysis,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Defect triage is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} defect triage validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
