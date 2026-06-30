#!/usr/bin/env node
export { validateTestDesignArtifacts } from './lib/test-design-artifacts-validate.mjs';
import { validateTestDesignArtifacts } from './lib/test-design-artifacts-validate.mjs';
import { ARTIFACT_PATHS } from './lib/artifact-paths.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorFindingsRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-test-design.mjs [options]

Options:
  --system-path <file>   Override system test design path
  --proposal-path <file> Override per-RF proposal path
  --allow-missing        Return success when files are missing
  --require-rf-id        Fail when RF IDs are not mentioned in the proposal
  --json                 Print machine-readable JSON only
  --help                 Show this help

Validates ${ARTIFACT_PATHS.testDesignSystem} and ${ARTIFACT_PATHS.testDesignProposal} structure.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  if (!jsonMode) logHeader('QA AI test design validator');
  const result = await validateTestDesignArtifacts(process.cwd(), {
    systemPath: args['system-path'],
    proposalPath: args['proposal-path'],
    allowMissing: Boolean(args['allow-missing']),
    requireRfId: Boolean(args['require-rf-id'])
  });

  const aiWarnings = (result.aiCoverage?.findings || []).filter((f) => f.severity !== 'error').map((f) => f.message);
  const findings = [
    ...result.errors.map((message) => ({ severity: 'error', message })),
    ...aiWarnings.map((message) => ({ severity: 'warning', message }))
  ];

  if (jsonMode) {
    finishValidatorFindingsRun({
      ok: result.errors.length === 0,
      errors: result.errors,
      warnings: aiWarnings,
      findings,
      jsonMode: true
    });
    return;
  }

  if (result.system.skipped) console.log('SKIP - system test design file not found.');
  else if (result.system.ok) console.log(`PASS - ${result.system.path}`);

  if (result.proposal.skipped) console.log('SKIP - per-RF test design proposal not found.');
  else if (result.proposal.ok) console.log(`PASS - ${result.proposal.path}`);

  if (result.aiCoverage?.findings?.length > 0) {
    for (const finding of result.aiCoverage.findings) {
      const label = finding.severity === 'error' ? 'FAIL' : 'WARN';
      console.log(`${label} [ai-coverage] ${finding.message}`);
    }
  }

  finishValidatorFindingsRun({
    ok: result.errors.length === 0,
    errors: result.errors,
    warnings: aiWarnings,
    findings,
    jsonMode: false,
    successMessage: '\nVALID - test design artifacts passed validation.',
    failureMessage: `\nFAILED - ${result.errors.length} test design validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
