#!/usr/bin/env node
import { collectQaMetrics, formatQaMetricsHuman } from './lib/qa-metrics.mjs';
import { parseArgs } from './lib/utils.mjs';

const args = parseArgs(process.argv);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/qa-metrics.mjs [options]

Options:
  --json              Machine-readable JSON output
  --since <ISO date>  Include runs started at or after this timestamp
  --run <run-id>      Report one run only
  --help              Show this help
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const metrics = await collectQaMetrics(process.cwd(), {
    since: args.since || null,
    run: args.run || null
  });

  for (const warning of metrics.warnings) {
    console.error(`[WARN] ${warning}`);
  }

  if (args.json) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log(formatQaMetricsHuman(metrics));
  }
}

main().catch((error) => {
  if (args.json) {
    console.error(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
  } else {
    console.error(error.message || error);
  }
  process.exit(1);
});
