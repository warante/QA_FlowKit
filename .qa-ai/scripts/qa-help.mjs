#!/usr/bin/env node
import { formatHelpReport, inspectQaWorkflow } from './lib/qa-next-steps.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';

const args = parseArgs(process.argv);
const query = args._.join(' ').trim();

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/qa-help.mjs [options] [question]

Options:
  --json     Print machine-readable JSON
  --help     Show this help

Inspects qa-ai.config.yaml, QA artifacts and project.qaTrack to recommend the next workflow step.

Examples:
  node .qa-ai/scripts/qa-help.mjs
  node .qa-ai/scripts/qa-help.mjs --json
  node .qa-ai/scripts/qa-help.mjs "where do I start for manual QA?"
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const report = await inspectQaWorkflow(process.cwd());

  if (args.json) {
    console.log(JSON.stringify({ query: query || null, ...report }, null, 2));
    return;
  }

  logHeader('QA help');
  console.log(formatHelpReport(report, { query }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
