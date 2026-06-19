import fs from 'node:fs/promises';
import path from 'node:path';

const DETECTABLE_ADAPTERS = [
  ['claude', '.claude'],
  ['codex', '.codex'],
  ['opencode', '.opencode'],
  ['cline', '.cline'],
  ['continue', '.continue'],
  ['aider', '.aider'],
  ['goose', '.goose'],
  ['gemini', 'GEMINI.md']
];

const EXTRA_ADAPTER_MARKERS = [
  ['cline', '.clinerules'],
  ['aider', '.aider.conf.yml'],
  ['generic', 'AGENTS.md']
];

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectExistingAdapters(root) {
  const names = [];
  for (const [name, relPath] of DETECTABLE_ADAPTERS) {
    if (await pathExists(path.join(root, relPath))) names.push(name);
  }
  for (const [name, relPath] of EXTRA_ADAPTER_MARKERS) {
    if (await pathExists(path.join(root, relPath))) names.push(name);
  }
  return [...new Set(names)];
}

export async function defaultInitAdapters(root) {
  const detected = (await detectExistingAdapters(root)).filter((name) => name !== 'generic');
  return ['generic', ...detected];
}
