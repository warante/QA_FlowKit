#!/usr/bin/env node
import { validateQualityReport } from './lib/quality-report.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-quality-report.mjs [options]

Options:
  --path <file>       Override testDesign.quality.reportPath
  --features <dir>    Override configured feature root
  --mode <off|advisory|gate> Override testDesign.quality.mode
  --min <n>           Override testDesign.quality.minDimensionsPassed
  --rf <RF-ID>        Validate only feature files traced to one RF
  --allow-empty       Return success when no matching feature files exist
  --allow-missing     Return success when the report is missing
  --json              Print machine-readable JSON only
  --help              Show this help
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const result = await validateQualityReport(cwd, {
    reportPath: args.path,
    featureRoot: args.features,
    mode: args.mode,
    minDimensionsPassed: args.min === undefined ? undefined : Number(args.min),
    rf: args.rf,
    allowEmpty: Boolean(args['allow-empty']),
    allowMissing: Boolean(args['allow-missing'])
  });

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    logHeader('QA AI Gherkin quality report validator');
    if (result.skipped) {
      console.log(`SKIP - quality mode is ${result.mode}.`);
    }
    if (result.message) console.log(result.message);
    for (const finding of result.findings || []) {
      const location = finding.file || finding.path || '';
      console.log(`[${finding.severity.toUpperCase()}] ${location ? `${location}: ` : ''}${finding.message}`);
    }
    if (result.ok) {
      console.log(
        `\nVALID - quality report completed with ${(result.warnings || []).length} warning(s) in ${result.mode} mode.`
      );
    } else {
      console.log(`\nFAILED - ${(result.errors || []).length} quality report error(s).`);
    }
  }

  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  if (args.json) {
    console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
  } else {
    console.error(error);
  }
  process.exit(1);
});
