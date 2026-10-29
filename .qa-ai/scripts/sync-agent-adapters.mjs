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
import { syncNativeSkill, syncCodexHooks } from './lib/native-agent-adapters.mjs';
import { syncAdapterCommands } from './lib/adapter-commands-sync.mjs';
import { formatUnknownNamesError, resolveAdapterSelection } from './lib/adapter-selection.mjs';
import { readModuleInstallation, availableModuleAdapters, assertModuleAdapters } from './lib/module-installation.mjs';

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
  --hooks            Opt in to Codex lifecycle hooks (review and trust with /hooks)
  --help             Show this help

Supported adapters: ${Object.keys(adapterMap).join(', ')}
`);
}

function selectedAdapterNames(available = Object.keys(adapterMap)) {
  return resolveAdapterSelection([...commaList(args.adapters), ...commaList(args.adapter)], available);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('Sync agent adapters');
  const installation = await readModuleInstallation(cwd);
  const available = installation ? availableModuleAdapters(installation.modules) : Object.keys(adapterMap);
  const names = selectedAdapterNames(available);
  const unknownMessage = formatUnknownNamesError(names, Object.keys(adapterMap), 'adapter');
  if (unknownMessage) {
    console.error(unknownMessage);
    process.exit(1);
  }
  await assertModuleAdapters(cwd, names);
  await syncAdapterCommands(
    path.join(cwd, '.qa-ai'),
    ['claude', 'opencode'].filter((name) => available.includes(name))
  );

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
    manifestEntries.push(...(await syncNativeSkill(cwd, name, force)));
    if (name === 'codex' && args.hooks) {
      const entry = await syncCodexHooks(cwd, force);
      if (entry) manifestEntries.push(entry);
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
