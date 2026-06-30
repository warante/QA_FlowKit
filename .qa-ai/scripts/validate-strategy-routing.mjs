#!/usr/bin/env node
import { validateStrategyRouting } from './lib/strategy-routing-validate.mjs';
import { getConfigValue, loadQaAiConfig, logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain, validatorOptionsFromArgs } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-strategy-routing.mjs [options]

Options:
  --proposal-path <file>  Override per-RF proposal path
  --allow-missing         Return success when proposal is missing
  --json                  Print machine-readable JSON only
  --help                  Show this help

Validates ## Strategy routing decisions when testDesign.strategyRouting.mode is strict.
In off or advisory mode this validator returns success without enforcing rows.
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
  if (!jsonMode) logHeader('QA AI strategy routing validator');

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const mode = String(getConfigValue(config, 'testDesign.strategyRouting.mode', 'off')).toLowerCase();
  const options = validatorOptionsFromArgs(args);

  if (mode !== 'strict') {
    const message = `SKIP - testDesign.strategyRouting.mode is "${mode || 'off'}" (strict not enabled).`;
    finishValidatorRun({
      ok: true,
      errors: [],
      warnings: mode === 'advisory' ? [message] : [],
      jsonMode,
      successMessage: message
    });
    return;
  }

  const result = await validateStrategyRouting(cwd, {
    ...options,
    config,
    proposalPath: args['proposal-path']
  });

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    jsonMode,
    successMessage: 'PASS - strategy routing decisions satisfy strict mode.',
    failureMessage: `\nFAILED - ${result.errors.length} strategy routing validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
