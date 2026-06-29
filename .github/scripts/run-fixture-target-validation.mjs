#!/usr/bin/env node
/**
 * Unified fixture-target validation (golden-target, karate-target, …).
 * Usage: node .github/scripts/run-fixture-target-validation.mjs --fixture golden-target
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { node, repoRoot, run } from './lib/ci-helpers.mjs';

const fixtureArg =
  process.argv.find((arg) => arg.startsWith('--fixture='))?.slice('--fixture='.length) || process.argv[2];
if (!fixtureArg) {
  console.error('Usage: run-fixture-target-validation.mjs --fixture=<name>');
  process.exit(1);
}

const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', fixtureArg);
const tempPrefix = `qa-flowkit-${fixtureArg.replace(/[^a-z0-9-]+/gi, '-')}-`;

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), tempPrefix));
  try {
    await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(tempRoot, '.qa-ai'), { recursive: true, force: true });
    await fs.cp(fixtureRoot, tempRoot, { recursive: true, force: true });

    run(node, [path.join(tempRoot, '.qa-ai/scripts/validate-target.mjs')], { cwd: tempRoot, stdio: 'inherit' });
    console.log(`${fixtureArg} validation passed.`);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
