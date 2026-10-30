#!/usr/bin/env node
import { buildPrSummary, formatPrSummary, writePrSummary } from './lib/pr-summary.mjs';
import { parseArgs } from './lib/utils.mjs';
import { redactValidatorDiagnostics } from './lib/secret-patterns.mjs';

const args = parseArgs(process.argv);

async function main() {
  if (args.help) {
    console.log(`Usage: node .qa-ai/scripts/pr-summary.mjs [options]

  --base <ref>          PR base ref (default: main; must exist locally)
  --head <ref>          PR head ref (default: HEAD)
  --matrix-path <file>  Override the configured traceability matrix path
  --output <file>       Save Markdown to a repository-relative path (parent must exist)
  --force               Explicitly replace an existing --output file
  --json                Print a structured summary instead of Markdown
  --help                Show this help

Read-only by default. Compares merge-base(base, head) to head, excluding local edits.
Does not execute tests, assess coverage, publish a PR or grant approvals.`);
    return;
  }
  for (const name of Object.keys(args).filter((name) => name !== '_')) {
    if (!['base', 'head', 'matrix-path', 'output', 'force', 'json'].includes(name))
      throw new Error(`Unknown option: --${name}`);
  }
  if (args._.length) throw new Error('Unexpected positional arguments.');
  for (const name of ['base', 'head', 'matrix-path', 'output']) {
    if (args[name] !== undefined && (typeof args[name] !== 'string' || !args[name]))
      throw new Error(`--${name} requires a value.`);
  }
  if (args.force && !args.output) throw new Error('--force requires --output.');
  const cwd = process.cwd();
  const report = await buildPrSummary(cwd, { base: args.base, head: args.head, matrixPath: args['matrix-path'] });
  const markdown = formatPrSummary(report);
  if (args.output) await writePrSummary(cwd, args.output, markdown, { force: Boolean(args.force) });
  console.log(args.json ? JSON.stringify(report, null, 2) : markdown.trimEnd());
}

main().catch((error) => {
  const message = redactValidatorDiagnostics(error.message || String(error));
  if (args.json) console.log(JSON.stringify({ ok: false, errors: [message] }));
  else console.error(message);
  process.exitCode = 1;
});
