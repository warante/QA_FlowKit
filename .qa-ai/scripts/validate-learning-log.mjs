#!/usr/bin/env node
export { validateLearningLog } from './lib/learning-log.mjs';
import { validateLearningLog } from './lib/learning-log.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-learning-log.mjs [options]

Options:
  --path <file>    Override log path
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
  if (!jsonMode) logHeader('QA AI learning log validator');

  const result = await validateLearningLog(process.cwd(), {
    logPath: args.path,
    allowMissing: Boolean(args['allow-missing'])
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: '[PASS] Learning log is fully valid.',
    failureMessage: `\nFAILED - ${result.errors.length} learning log validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
