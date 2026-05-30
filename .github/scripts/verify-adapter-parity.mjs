#!/usr/bin/env node
/**
 * Ensures root adapter copies match .qa-ai/adapters templates (single source of truth).
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const pairs = [
  {
    label: 'Claude Code',
    expected: path.join(repoRoot, '.qa-ai', 'adapters', 'claude'),
    actual: path.join(repoRoot, '.claude')
  },
  {
    label: 'OpenCode',
    expected: path.join(repoRoot, '.qa-ai', 'adapters', 'opencode'),
    actual: path.join(repoRoot, '.opencode')
  }
];

async function listFiles(dir) {
  const results = [];
  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else results.push(full);
    }
  }
  await walk(dir);
  return results.sort();
}

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function relativeFiles(root, files) {
  const map = new Map();
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const content = await fs.readFile(file);
    map.set(rel, hash(content));
  }
  return map;
}

async function comparePair({ label, expected, actual }) {
  const expectedFiles = await listFiles(expected);
  const actualFiles = await listFiles(actual);
  const expectedMap = await relativeFiles(expected, expectedFiles);
  const actualMap = await relativeFiles(actual, actualFiles);
  const errors = [];

  for (const rel of expectedMap.keys()) {
    if (!actualMap.has(rel)) {
      errors.push(`${label}: missing in root copy: ${rel}`);
      continue;
    }
    if (expectedMap.get(rel) !== actualMap.get(rel)) {
      errors.push(`${label}: content drift: ${rel}`);
    }
  }

  for (const rel of actualMap.keys()) {
    if (!expectedMap.has(rel)) {
      errors.push(`${label}: unexpected extra file in root copy: ${rel}`);
    }
  }

  return errors;
}

async function main() {
  const allErrors = [];
  for (const pair of pairs) {
    allErrors.push(...(await comparePair(pair)));
  }

  if (allErrors.length > 0) {
    console.error('Adapter parity check failed:\n');
    for (const error of allErrors) console.error(`  - ${error}`);
    console.error('\nFix: edit .qa-ai/adapters/* only, then run:');
    console.error('  node .qa-ai/scripts/sync-agent-adapters.mjs --adapters claude,opencode --force');
    process.exit(1);
  }

  console.log('Adapter parity check passed (claude, opencode).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
