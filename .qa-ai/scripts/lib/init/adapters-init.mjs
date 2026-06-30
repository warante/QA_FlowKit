import path from 'node:path';
import { defaultInitAdapters } from '../detect-adapters.mjs';
import { commaList, pathExists } from '../utils.mjs';
import { githubRepositorySlug } from '../package-origin.mjs';

export function shouldPromptForAdapters(args) {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI && !args['no-interactive']);
}

export async function promptAdapterSelection(defaultAdapters, args) {
  if (!shouldPromptForAdapters(args)) return defaultAdapters;

  const choices = [
    ['1', 'Auto-detect this repository', '__auto__'],
    ['2', 'Claude Code slash commands', 'claude'],
    ['3', 'OpenCode slash commands', 'opencode'],
    ['4', 'Codex adapter instructions', 'codex'],
    ['5', 'Gemini CLI context', 'gemini'],
    ['6', 'Generic AGENTS.md only', 'generic'],
    ['7', 'All adapters', 'all'],
    ['8', 'None', '__none__']
  ];
  const choiceMap = new Map([
    ...choices.map(([number, , value]) => [number, value]),
    ['auto', '__auto__'],
    ['detect', '__auto__'],
    ['none', '__none__']
  ]);
  const valueSet = new Set(choices.map(([, , value]) => value));
  const defaultLabel = defaultAdapters.length > 0 ? defaultAdapters.join(', ') : 'none';

  console.log('\nSelect AI coding CLI adapter(s):');
  for (const [number, label, value] of choices) {
    const suffix = value === '__auto__' ? ` (default: ${defaultLabel})` : '';
    console.log(`  ${number}. ${label}${suffix}`);
  }
  console.log('Use comma-separated numbers or adapter names, for example "2,3".');

  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = await rl.question('Adapter selection [1]: ');
  } finally {
    rl.close();
  }

  const tokens = String(answer || '1')
    .split(/[,\s]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const selected = tokens.map((token) => choiceMap.get(token) || token);

  const invalid = selected.filter((value) => !valueSet.has(value));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown adapter selection: ${invalid.join(', ')}. Use one or more of: claude, opencode, codex, gemini, generic, all, none.`
    );
  }
  if (selected.includes('__auto__')) return defaultAdapters;
  if (selected.includes('__none__')) {
    if (selected.length > 1) {
      throw new Error('Adapter selection "none" cannot be combined with other adapters.');
    }
    return [];
  }
  if (selected.includes('all')) return ['all'];
  return [...new Set(selected)];
}

export async function selectedAdapters(cwd, args) {
  if (args['no-adapters']) return [];
  const requested = [...commaList(args.adapters), ...commaList(args.adapter)].map((name) => name.toLowerCase());
  if (requested.length === 0) return promptAdapterSelection(await defaultInitAdapters(cwd), args);
  if (requested.includes('all')) return ['all'];
  return [...new Set(requested)];
}

export async function maybePrintClaudePluginHint(cwd) {
  const claudeDir = path.join(cwd, '.claude');
  if (!(await pathExists(claudeDir))) return;
  const localMarketplace = path.join(cwd, '.claude-plugin', 'marketplace.json');
  if (await pathExists(localMarketplace)) return;
  console.log(
    `\nClaude Code plugin tip: install the QA FlowKit plugin with \`claude marketplace add ${githubRepositorySlug()}\` for namespaced skills and hooks.`
  );
}
