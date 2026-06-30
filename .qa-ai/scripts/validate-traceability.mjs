#!/usr/bin/env node
export { validateTraceability } from './lib/traceability-matrix-validate.mjs';
import { validateTraceability } from './lib/traceability-matrix-validate.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-traceability.mjs [options]

Options:
  --path <file>           Override configured traceability matrix path
  --normalized-path <file> Override normalized requirements path
  --features <dir>        Override configured feature root
  --allow-empty           Return success when no .feature files exist
  --allow-missing         Return success when the traceability matrix is missing
  --json                  Print machine-readable JSON only
  --help                  Show this help

Validates functional feature coverage, traceability matrix table shape, duplicate rows and source NFR traceability.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  const result = await validateTraceability(process.cwd(), {
    path: args.path,
    normalizedPath: args['normalized-path'],
    features: args.features,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing'])
  });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
    return;
  }

  logHeader('QA AI traceability validator');
  for (const warning of result.warnings || []) console.log(`[WARN] ${warning}`);

  if (result.nfrMetrics && result.nfrMetrics.total > 0) {
    const metrics = result.nfrMetrics;
    console.log(
      `\nNFR metrics: total=${metrics.total} covered=${metrics.covered} planned=${metrics.planned} ` +
        `blocked=${metrics.blocked} residual-risk=${metrics.residualRisk} not-applicable=${metrics.notApplicable}`
    );
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors,
    warnings: [],
    jsonMode: false,
    successMessage: `\n[PASS] ${result.matrixPath} traceability validation completed.`,
    failureMessage: `\nFAILED - ${(result.errors || []).length} traceability validation error(s).`
  });
}

runValidatorMain(import.meta.url, main);
