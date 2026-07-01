#!/usr/bin/env node
import { formatProjectConfigSummary, resolveProjectConfigSummary } from './lib/config-resolve.mjs';
import { logHeader, parseArgs } from './lib/utils.mjs';

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/show-config.mjs [options]

Options:
  --json   Print machine-readable JSON with resolved project settings
  --help   Show this help

Resolves qa-ai.config.yaml from the repository root (legacy) or .qa-ai/qa-ai.config.yaml
(compact default). Root config takes precedence when both exist.
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const summary = await resolveProjectConfigSummary(process.cwd());

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  logHeader('QA FlowKit resolved config');
  console.log(formatProjectConfigSummary(summary));
  if (summary.dualConfig) {
    console.log('[WARN] Both qa-ai.config.yaml and .qa-ai/qa-ai.config.yaml exist; root config is active.');
  }
  if (!summary.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
