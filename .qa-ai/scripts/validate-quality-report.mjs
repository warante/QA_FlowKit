#!/usr/bin/env node
import { validateQualityReport } from './lib/quality-report.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import { finishValidatorRun, isJsonMode, runValidatorMain } from './lib/validator-cli.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-quality-report.mjs [options]

Options:
  --path <file>       Override testDesign.quality.reportPath
  --features <dir>    Override configured feature root
  --mode <off|advisory|strict> Override testDesign.quality.mode
  --min <n>           Override testDesign.quality.minDimensionsPassed
  --rf <RF-ID>        Validate only feature files traced to one RF
  --allow-empty       Return success when no matching feature files exist
  --allow-missing     Return success when the report is missing
  --json              Print machine-readable JSON only
  --help              Show this help
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = isJsonMode(args);
  const result = await validateQualityReport(process.cwd(), {
    reportPath: args.path,
    featureRoot: args.features,
    mode: args.mode,
    minDimensionsPassed: args.min === undefined ? undefined : Number(args.min),
    rf: args.rf,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing'])
  });

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
    return;
  }

  logHeader('QA AI Gherkin quality report validator');
  if (result.skipped) console.log(`SKIP - quality mode is ${result.mode}.`);
  if (result.message) console.log(result.message);
  for (const finding of result.findings || []) {
    const location = finding.file || finding.path || '';
    console.log(`[${finding.severity.toUpperCase()}] ${location ? `${location}: ` : ''}${finding.message}`);
  }

  finishValidatorRun({
    ok: result.ok,
    errors: result.errors || [],
    warnings: result.warnings || [],
    jsonMode: false,
    successMessage: `\nVALID - quality report completed with ${(result.warnings || []).length} warning(s) in ${result.mode} mode.`,
    failureMessage: `\nFAILED - ${(result.errors || []).length} quality report error(s).`
  });
}

runValidatorMain(import.meta.url, main);
