#!/usr/bin/env node
export { validateReleaseGateFile } from './lib/release-gate-validate.mjs';
import { validateReleaseGateFile } from './lib/release-gate-validate.mjs';
import { ARTIFACT_PATHS } from './lib/artifact-paths.mjs';
import { getConfigValue, loadQaAiConfig, logHeader, parseArgs } from './lib/utils.mjs';
import { runValidatorMain } from './lib/validator-cli.mjs';

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

  const jsonMode = Boolean(args.json);
  if (!jsonMode) logHeader('QA AI release gate validator');
  const configInfo = await loadQaAiConfig(process.cwd());
  const gatePath = args.path || getConfigValue(configInfo.data, 'release.gatePath', ARTIFACT_PATHS.releaseGate);

  const result = await validateReleaseGateFile(process.cwd(), gatePath, {
    allowMissing: Boolean(args['allow-missing']),
    allowPending: Boolean(args['allow-pending'])
  });

  if (result.skipped) {
    if (jsonMode) console.log(JSON.stringify({ ok: true, skipped: true, errors: [] }));
    else console.log(`Release gate not found at ${gatePath}.`);
    return;
  }

  if (!result.ok) {
    if (jsonMode) {
      console.log(
        JSON.stringify({
          ok: false,
          errors: result.errors,
          findings: result.errors.map((message) => ({ severity: 'error', message }))
        })
      );
    } else {
      for (const error of result.errors) console.log(`[FAIL] ${error}`);
      console.log(`\nFAILED - ${result.errors.length} release gate validation error(s).`);
    }
    process.exit(1);
  }

  if (jsonMode) console.log(JSON.stringify({ ok: true, decision: result.decision, errors: [] }));
  else console.log(`[PASS] ${gatePath} decision=${result.decision}`);
}

runValidatorMain(import.meta.url, main);
