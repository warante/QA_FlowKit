#!/usr/bin/env node
import { computeRFDependencyGraph, formatGraphReport, formatGraphDot } from './lib/rf-dependency-graph.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';
import fs from 'node:fs/promises';

const args = parseArgs(process.argv);
const cwd = process.cwd();

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/rf-dependency-graph.mjs [options]

Options:
  --matrix-path <file>       Override traceability matrix path
  --normalized-path <file>   Override normalized requirements path
  --no-implicit              Skip implicit dependency inference
  --output <file>            Write Markdown report to file
  --dot-output <file>        Write Graphviz DOT file
  --json                     Output structured JSON format
  --help                     Show this help

Builds a dependency graph of RFs from explicit declarations and implicit traceability links.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI RF dependency graph');
  }

  const options = {};
  if (args['matrix-path']) options.matrixPath = args['matrix-path'];
  if (args['normalized-path']) options.normalizedPath = args['normalized-path'];
  if (args['no-implicit']) options.includeImplicit = false;

  const result = await computeRFDependencyGraph(cwd, options);

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

  const report = formatGraphReport(result.graph, result.cycles, result.metrics);
  console.log(report);

  if (args.output) {
    await fs.writeFile(args.output, report, 'utf8');
    console.log(`\nReport written to ${args.output}`);
  }

  if (args['dot-output']) {
    const dot = formatGraphDot(result.graph);
    await fs.writeFile(args['dot-output'], dot, 'utf8');
    console.log(`DOT graph written to ${args['dot-output']}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
