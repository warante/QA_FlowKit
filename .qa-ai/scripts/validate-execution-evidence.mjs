#!/usr/bin/env node
import { validateExecutionEvidence } from './lib/execution-evidence-validate.mjs';
import { logHeader, parseArgs, toPosixPath } from './lib/utils.mjs';

export { validateExecutionEvidence } from './lib/execution-evidence-validate.mjs';

const args = parseArgs(process.argv);
const cwd = process.cwd();

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-execution-evidence.mjs [options]

Options:
  --path <file>       Override traceability matrix path
  --mapping <file>    Override test management mapping file path
  --allow-missing     Return success when results files or traceability rows lack results
  --json              Output structured JSON format
  --help              Show this help

Validates that real execution results and AI eval evidence match the traceability matrix.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI execution evidence validator');
  }

  const result = await validateExecutionEvidence(cwd, {
    matrixPath: args.path,
    mappingFile: args.mapping,
    allowMissing: Boolean(args['allow-missing'])
  });

  if (jsonMode) {
    const findings = [];
    for (const error of result.errors) {
      findings.push({ severity: 'error', message: error });
    }
    for (const warning of result.warnings) {
      // Remove prefix [WARN] if it exists
      const cleanMsg = warning.replace(/^\[WARN\]\s*/, '');
      findings.push({ severity: 'warning', message: cleanMsg });
    }

    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          findings,
          report: result.report
        },
        null,
        2
      )
    );
    process.exit(result.ok ? 0 : 1);
  }

  // Standard Text Output
  for (const warning of result.warnings) {
    console.log(warning);
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.log(`[FAIL] ${error}`);
    }
    console.log(`\nFAILED - ${result.errors.length} execution evidence error(s).`);
    process.exit(1);
  }

  // Print summary of RF coverage
  console.log('[PASS] All linked automated tests and AI eval evidence are valid.');
  console.log('\nRF Execution Summary:');
  for (const [rf, rfReport] of Object.entries(result.report)) {
    console.log(
      `  - ${rf}: status=${rfReport.status} (tests=${rfReport.totalTests}, automated=${rfReport.automatedTests}, passed=${rfReport.passed}, failed=${rfReport.failed}, quarantined=${rfReport.quarantinedFailed}, missing=${rfReport.missing})`
    );
  }
}

// Only run as script if executed directly
if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
