#!/usr/bin/env node
/**
 * Runs validate-target against the in-repo golden-target fixture with a full .qa-ai copy.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'golden-target');
const node = process.execPath;

async function cpRecursive(src, dest) {
  await fs.cp(src, dest, { recursive: true, force: true });
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-golden-'));
  try {
    await cpRecursive(path.join(repoRoot, '.qa-ai'), path.join(tempRoot, '.qa-ai'));
    await cpRecursive(fixtureRoot, tempRoot);

    const result = spawnSync(node, ['.qa-ai/scripts/validate-target.mjs'], {
      cwd: tempRoot,
      encoding: 'utf8',
      stdio: 'inherit',
      shell: false
    });

    if (result.status !== 0) {
      console.error('Golden target validate-target failed.');
      process.exit(result.status ?? 1);
    }
    console.log('Golden target validation passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
