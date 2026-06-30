#!/usr/bin/env node
export { validateTestCoverage } from './lib/test-coverage-validate.mjs';
import { validateTestCoverage } from './lib/test-coverage-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-test-coverage.mjs [options]

Options:
  --path <dir>          Override the configured feature root
  --proposal-path <file> Override the per-RF proposal path
  --mode <off|advisory|strict> Override testDesign.coverage.mode
  --rf <RF-ID>          Validate only one RF
  --allow-empty         Return success when no feature files exist
  --allow-missing       Return success when the proposal is missing
  --json                Print machine-readable JSON only
  --help                Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const result = await validateTestCoverage(process.cwd(), {
    path: args.path,
    proposalPath: args['proposal-path'],
    mode: args.mode,
    rf: args.rf,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing'])
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logHeader('QA AI test coverage validator');
    if (result.skipped) console.log(`SKIP - coverage mode is ${result.mode}.`);
    if (result.message) console.log(result.message);
    for (const finding of result.findings || []) {
      console.log(`[${finding.severity.toUpperCase()}] ${finding.rf ? `${finding.rf}: ` : ''}${finding.message}`);
    }
    if (result.ok) {
      console.log(
        `\nVALID - coverage policy completed with ${(result.warnings || []).length} warning(s) in ${result.mode} mode.`
      );
    } else {
      console.log(`\nFAILED - ${(result.errors || []).length} coverage error(s).`);
    }
  }

  if (!result.ok) process.exit(1);
}

runValidatorMain(import.meta.url, main);
