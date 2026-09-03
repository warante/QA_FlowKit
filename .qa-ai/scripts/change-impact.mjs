#!/usr/bin/env node
import { computeChangeImpact, formatChangeImpactReport } from './lib/change-impact.mjs';
import { logHeader, parseArgs, toPosixPath } from './lib/utils.mjs';

const args = parseArgs(process.argv);
const cwd = process.cwd();

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/change-impact.mjs [options]

Options:
  --matrix-path <file>   Override traceability matrix path
  --branch <name>        Compare against branch (default: main)
  --commit <hash>        Compare against specific commit
  --diff-file <file>     Read diff from file instead of git
  --output <file>        Write Markdown report to file
  --json                 Output structured JSON format
  --help                 Show this help

Analyzes code changes and predicts affected RFs for targeted testing.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI change impact analysis');
  }

  const options = {};
  if (args['matrix-path']) {
    options.matrixPath = args['matrix-path'];
  }
  if (args.branch) {
    options.branch = args.branch;
  }
  if (args.commit) {
    options.commit = args.commit;
  }
  if (args['diff-file']) {
    const fs = await import('node:fs/promises');
    options.diffInput = await fs.readFile(args['diff-file'], 'utf8');
  }

  const result = await computeChangeImpact(cwd, options);

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

  const report = formatChangeImpactReport(result.metrics);
  console.log(report);

  if (args.output) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(args.output, report, 'utf8');
    console.log(`\nReport written to ${args.output}`);
  }
}

if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
