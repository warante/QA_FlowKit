#!/usr/bin/env node
import { computeTraceabilityMetrics, formatMetricsReport } from './lib/traceability-metrics.mjs';
import { logHeader, parseArgs, loadQaAiConfig, readText, resolveRepoPath, pathExists } from './lib/utils.mjs';
import { getConfigValue } from './lib/utils.mjs';
import { ARTIFACT_PATHS } from './lib/artifact-paths.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/traceability-metrics.mjs [options]

Options:
  --path <file>     Override configured traceability matrix path
  --json            Print machine-readable JSON only
  --output <file>   Write Markdown report to file
  --help            Show this help

Generates quantitative traceability metrics from the traceability matrix.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const cwd = process.cwd();
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const matrixPath = args.path || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  const matrixFilePath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });

  if (!(await pathExists(matrixFilePath))) {
    console.error(`Traceability matrix not found at ${matrixPath}.`);
    process.exit(1);
  }

  const matrixContent = await readText(matrixFilePath);
  const metrics = computeTraceabilityMetrics(matrixContent);
  const jsonMode = Boolean(args.json);

  if (jsonMode) {
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  logHeader('QA AI traceability metrics');
  const report = formatMetricsReport(metrics);
  console.log(report);

  if (args.output) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(args.output, report, 'utf8');
    console.log(`\nReport written to ${args.output}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
