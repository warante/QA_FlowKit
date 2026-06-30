#!/usr/bin/env node
export { validateReleaseGateFile } from './lib/release-gate-validate.mjs';
import { validateReleaseGateFile } from './lib/release-gate-validate.mjs';
import { ARTIFACT_PATHS } from './lib/artifact-paths.mjs';
import { getConfigValue, loadQaAiConfig, logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-release-gate.mjs [options]

Options:
  --path <file>       Override release gate file path
  --allow-missing     Return success when the gate file is missing
  --allow-pending     Allow decision: PENDING (draft gates only)
  --json              Print machine-readable JSON only
  --help              Show this help

Validates ${ARTIFACT_PATHS.releaseGate} shape and decision rules.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI release gate validator');
  const configInfo = await loadQaAiConfig(process.cwd());
  const gatePath = args.path || getConfigValue(configInfo.data, 'release.gatePath', ARTIFACT_PATHS.releaseGate);

  const result = await validateReleaseGateFile(process.cwd(), gatePath, {
    allowMissing: Boolean(args['allow-missing']),
    allowPending: Boolean(args['allow-pending'])
  });

  if (result.skipped) {
    if (jsonMode) finishValidatorRun({ ok: true, jsonMode: true, extraJson: { skipped: true } });
    else console.log(`Release gate not found at ${gatePath}.`);
    return;
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: [],
    jsonMode,
    successMessage: `[PASS] ${gatePath} decision=${result.decision}`,
    failureMessage: `\nFAILED - ${result.errors.length} release gate validation error(s).`,
    extraJson: jsonMode && result.ok ? { decision: result.decision } : {}
  });
}

runValidatorMain(import.meta.url, main);
