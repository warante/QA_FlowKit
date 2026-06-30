#!/usr/bin/env node
import path from 'node:path';
import {
  commaList,
  copyDirSafe,
  manifestEntry,
  manifestPath,
  parseArgs,
  pathExists,
  recordManifestEntries,
  relativeTo,
  logHeader
} from './lib/utils.mjs';
import { mergeClaudeSettings } from './lib/claude-settings.mjs';
import { syncAdapterCommands } from './lib/adapter-commands-sync.mjs';
import { formatUnknownNamesError, resolveAdapterSelection } from './lib/adapter-selection.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const force = Boolean(args.force);
const adaptersRoot = path.join(cwd, '.qa-ai', 'adapters');

const adapterMap = {
  generic: { source: 'generic', target: '.' },
  claude: { source: 'claude', target: '.claude' },
  codex: { source: 'codex', target: '.codex' },
  opencode: { source: 'opencode', target: '.opencode' },
  cline: { source: 'cline', target: '.' },
  continue: { source: 'continue', target: '.continue' },
  aider: { source: 'aider', target: '.' },
  goose: { source: 'goose', target: '.goose' },
  gemini: { source: 'gemini', target: '.' }
};

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/sync-agent-adapters.mjs [options]

Options:
  --adapters <list>  Comma-separated adapters to sync, or "all" (default: all)
  --adapter <name>   Repeatable single adapter name
  --force            Overwrite existing adapter files
  --help             Show this help

Supported adapters: ${Object.keys(adapterMap).join(', ')}
`);
}

function selectedAdapterNames() {
  return resolveAdapterSelection([...commaList(args.adapters), ...commaList(args.adapter)], Object.keys(adapterMap));
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('Sync agent adapters');
  await syncAdapterCommands(path.join(cwd, '.qa-ai'));
  const names = selectedAdapterNames();
  const unknownMessage = formatUnknownNamesError(names, Object.keys(adapterMap), 'adapter');
  if (unknownMessage) {
    console.error(unknownMessage);
    process.exit(1);
  }

  if (names.length === 0) {
    console.log('No adapters selected.');
    return;
  }

  let missing = 0;
  const manifestEntries = [];
  for (const name of names) {
    const adapter = adapterMap[name];
    const source = path.join(adaptersRoot, adapter.source);
    const target = path.join(cwd, adapter.target);

    if (!(await pathExists(source))) {
      missing += 1;
      console.log(`[FAIL] Adapter ${name}: missing template ${relativeTo(cwd, source)}`);
      continue;
    }

    const results = await copyDirSafe(source, target, { force });
    const dirResults = results.filter((result) => result.type === 'dir' && result.created);
    const fileResults = results.filter((result) => result.type === 'file');
    console.log(`Adapter ${name}:`);
    for (const result of dirResults) {
      console.log(`  created ${relativeTo(cwd, result.path)}`);
      manifestEntries.push(
        await manifestEntry(cwd, result.path, {
          type: 'dir',
          category: 'adapter',
          source: `adapter:${name}`
        })
      );
    }
    for (const result of fileResults) {
      console.log(`  ${result.copied ? 'copied ' : 'skipped'} ${relativeTo(cwd, result.path)}`);
      if (result.copied) {
        manifestEntries.push(
          await manifestEntry(cwd, result.path, {
            type: 'file',
            category: 'adapter',
            source: `adapter:${name}`
          })
        );
      }
    }
    if (name === 'claude') {
      const settingsEntry = await mergeClaudeSettings(cwd, force);
      if (settingsEntry) {
        manifestEntries.push(settingsEntry);
      }
    }
  }

  if (missing > 0) {
    console.log(`\nFAILED - ${missing} adapter template(s) missing.`);
    process.exit(1);
  }

  const manifest = await recordManifestEntries(cwd, manifestEntries);
  if (manifest) console.log(`\nupdated ${relativeTo(cwd, manifestPath(cwd))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
