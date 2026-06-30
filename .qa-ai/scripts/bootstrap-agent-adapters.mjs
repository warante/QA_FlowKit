#!/usr/bin/env node
import path from 'node:path';
import {
  commaList,
  copyFileSafe,
  ensureDir,
  manifestEntry,
  manifestPath,
  parseArgs,
  pathExists,
  recordManifestEntries,
  relativeTo,
  logHeader
} from './lib/utils.mjs';
import { mergeClaudeSettings } from './lib/claude-settings.mjs';
import { formatUnknownNamesError, resolveAdapterSelection } from './lib/adapter-selection.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const force = Boolean(args.force);
const qaAiDir = path.join(cwd, '.qa-ai');

const bootstrapMap = {
  claude: {
    source: '.qa-ai/adapters/claude/commands/qa-init.md',
    target: '.claude/commands/qa-init.md',
    command: '/qa-init'
  },
  opencode: {
    source: '.qa-ai/adapters/opencode/commands/qa-init.md',
    target: '.opencode/commands/qa-init.md',
    command: '/qa-init'
  }
};

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/bootstrap-agent-adapters.mjs [options]

Copies minimal root slash commands so Claude Code and OpenCode can run /qa-init
after only the .qa-ai folder has been copied.

Options:
  --agents <list>  Comma-separated agents to bootstrap (default: claude,opencode)
  --agent <name>   Repeatable single agent name
  --force          Overwrite existing bootstrap command files
  --help           Show this help

Supported agents: ${Object.keys(bootstrapMap).join(', ')}
`);
}

function selectedAgents() {
  return resolveAdapterSelection([...commaList(args.agents), ...commaList(args.agent)], Object.keys(bootstrapMap));
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA FlowKit agent bootstrap');

  if (!(await pathExists(qaAiDir))) {
    console.error('Missing .qa-ai folder. Copy it into the repository root first.');
    process.exit(1);
  }

  const agents = selectedAgents();
  const unknownMessage = formatUnknownNamesError(agents, Object.keys(bootstrapMap), 'agent');
  if (unknownMessage) {
    console.error(unknownMessage);
    process.exit(1);
  }

  if (agents.length === 0) {
    console.log('No agents selected.');
    return;
  }

  const manifestEntries = [];

  for (const name of agents) {
    const bootstrap = bootstrapMap[name];
    const source = path.join(cwd, bootstrap.source);
    const target = path.join(cwd, bootstrap.target);

    if (!(await pathExists(source))) {
      console.log(`[FAIL] ${name}: missing ${bootstrap.source}`);
      continue;
    }

    const dirResult = await ensureDir(path.dirname(target));
    if (dirResult.created) {
      manifestEntries.push(
        await manifestEntry(cwd, dirResult.path, {
          type: 'dir',
          category: 'bootstrap',
          source: `bootstrap:${name}`
        })
      );
    }

    const result = await copyFileSafe(source, target, { force });
    console.log(`${name}: ${result.copied ? 'copied ' : 'skipped'} ${relativeTo(cwd, result.path)}`);
    if (result.copied) {
      manifestEntries.push(
        await manifestEntry(cwd, result.path, {
          type: 'file',
          category: 'bootstrap',
          source: `bootstrap:${name}`
        })
      );
    }
    if (name === 'claude') {
      const settingsEntry = await mergeClaudeSettings(cwd, force);
      if (settingsEntry) {
        manifestEntries.push(settingsEntry);
      }
    }
  }

  const manifest = await recordManifestEntries(cwd, manifestEntries);
  if (manifest) console.log(`updated ${relativeTo(cwd, manifestPath(cwd))}`);

  console.log('\nNext: open Claude Code or OpenCode in this repository and run:');
  console.log('/qa-init');
  console.log('\nAdvanced example for a manual-only QA setup:');
  console.log('/qa-init --preset manual-only --adapters claude,opencode');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
