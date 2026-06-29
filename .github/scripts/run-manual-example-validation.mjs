#!/usr/bin/env node
/**
 * Installs the locally packed CLI into the public manual-only example and validates it strictly.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  cliPath,
  installPackTarball,
  node,
  repoRoot,
  resolvePackTarball,
  run
} from './lib/ci-helpers.mjs';

const exampleRoot = path.join(repoRoot, 'examples', 'manual-only');

async function digestTree(root) {
  const entries = [];
  const ignoredTopLevel = new Set(['.qa-ai', 'node_modules']);

  async function visit(directory, depth = 0) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (depth === 0 && ignoredTopLevel.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, depth + 1);
      } else {
        const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, '/');
        const content = await fs.readFile(absolutePath);
        entries.push(`${relativePath}:${createHash('sha256').update(content).digest('hex')}`);
      }
    }
  }

  await visit(root);
  return entries.sort().join('\n');
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-manual-example-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');

  try {
    await fs.mkdir(npmCache, { recursive: true });
    await fs.cp(exampleRoot, targetRoot, { recursive: true });
    const originalDigest = await digestTree(targetRoot);

    const { tarball } = await resolvePackTarball({ packDir, npmCache });
    installPackTarball(targetRoot, tarball, { npmCache });

    const cli = cliPath(targetRoot);
    run(node, [cli, 'init', '--preset', 'manual-only', '--no-adapters', '--skip-doctor'], { cwd: targetRoot });

    const afterInitDigest = await digestTree(targetRoot);
    if (afterInitDigest !== originalDigest) {
      throw new Error('Packed init modified canonical example artifacts.');
    }

    run(node, [cli, 'doctor', '--strict'], { cwd: targetRoot });
    run(node, [cli, 'validate-target'], { cwd: targetRoot });

    console.log('Manual-only public example passed packed install and strict validation.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
