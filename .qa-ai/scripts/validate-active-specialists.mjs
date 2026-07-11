#!/usr/bin/env node
import { validateActiveSpecialists } from './lib/active-specialists-validate.mjs';
import { loadQaAiConfig, logHeader, parseArgs, pathExists, relativeTo, resolveRepoPath } from './lib/utils.mjs';
import {
  emitJson,
  finishValidatorRun,
  isJsonMode,
  runValidatorMain,
  validatorOptionsFromArgs
} from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-active-specialists.mjs [options]

Options:
  --allow-missing  Return success when qa-ai.config.yaml or active.md is missing
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

  const cwd = process.cwd();
  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI active specialists validator');

  const options = validatorOptionsFromArgs(args);
  const configInfo = await loadQaAiConfig(cwd);
  const activePath = resolveRepoPath(cwd, '.qa-ai/agents/specialists/active.md', {
    label: 'active specialists index'
  });
  const sourceRepo = await pathExists(resolveRepoPath(cwd, 'docs/qa-ai/architecture.md', { label: 'source marker' }));
  const wasMissing = options.allowMissing && (!configInfo.exists || (!(await pathExists(activePath)) && !sourceRepo));

  const result = await validateActiveSpecialists(cwd, options);

  if (wasMissing) {
    if (jsonMode) emitJson(true);
    else if (!configInfo.exists) console.log('No qa-ai.config.yaml found.');
    else console.log('No active specialists index found at .qa-ai/agents/specialists/active.md.');
    return;
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage:
      sourceRepo && !(await pathExists(activePath))
        ? '[PASS] Specialist catalog entries resolve to available source files; active.md is a generated target cache.'
        : `[PASS] ${relativeTo(cwd, activePath)} matches .qa-ai/qa-ai.config.yaml.`,
    failureMessage: `\nFAILED - ${result.errors.length} active specialist validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
