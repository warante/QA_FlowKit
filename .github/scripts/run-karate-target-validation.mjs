#!/usr/bin/env node
/**
 * Runs validate-target against the in-repo karate-target fixture with a full .qa-ai copy.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'karate-target');
const node = process.execPath;

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-karate-'));
  try {
    await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(tempRoot, '.qa-ai'), { recursive: true, force: true });
    await fs.cp(fixtureRoot, tempRoot, { recursive: true, force: true });

    const result = spawnSync(node, ['.qa-ai/scripts/validate-target.mjs'], {
      cwd: tempRoot,
      encoding: 'utf8',
      stdio: 'inherit',
      shell: false
    });

    if (result.status !== 0) {
      console.error('Karate target validate-target failed.');
      process.exit(result.status ?? 1);
    }
    console.log('Karate target validation passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
