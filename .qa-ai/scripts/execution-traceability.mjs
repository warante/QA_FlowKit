#!/usr/bin/env node
import { computeExecutionTraceability, formatExecutionTraceabilityReport } from './lib/execution-traceability.mjs';
import { logHeader, parseArgs, toPosixPath } from './lib/utils.mjs';

const args = parseArgs(process.argv);
const cwd = process.cwd();

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/execution-traceability.mjs [options]

Options:
  --matrix-path <file>   Override traceability matrix path
  --results-paths <glob> Override execution results paths (comma-separated)
  --output <file>        Write Markdown report to file
  --json                 Output structured JSON format
  --help                 Show this help

Links execution results to RFs via traceability matrix and generates coverage metrics.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI execution traceability');
  }

  const options = {};
  if (args['matrix-path']) {
    options.matrixPath = args['matrix-path'];
  }
  if (args['results-paths']) {
    options.resultsPaths = args['results-paths'].split(',').map((p) => p.trim());
  }

  const result = await computeExecutionTraceability(cwd, options);

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.log(`[FAIL] ${error}`);
    }
    console.log(`\nFAILED - ${result.errors.length} error(s).`);
    process.exit(1);
  }

  for (const warning of result.warnings) {
    console.log(`[WARN] ${warning}`);
  }

  const report = formatExecutionTraceabilityReport(result.metrics);
  console.log(report);

  if (args.output) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(args.output, report, 'utf8');
    console.log(`\nReport written to ${args.output}`);
  }
}

// Only run as script if executed directly
if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
