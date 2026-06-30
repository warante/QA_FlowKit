#!/usr/bin/env node
/**
 * Installs the locally packed CLI into the public manual-only example and validates it strictly.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { node, run } from './lib/ci-helpers.mjs';
import {
  exampleRootFromRepo,
  runPackedExampleValidation,
  runPackedInit,
  runPackedValidateTarget
} from './lib/packed-example-validation.mjs';

const exampleRoot = exampleRootFromRepo('examples', 'manual-only');

async function digestTree(root) {
  const entries = [];
  const ignoredPrefixes = [
    '.qa-ai/scripts/',
    '.qa-ai/agents/',
    '.qa-ai/rules/',
    '.qa-ai/templates/',
    '.qa-ai/contracts/',
    '.qa-ai/presets/',
    '.qa-ai/adapters/',
    '.qa-ai/workflows/',
    '.qa-ai/state/'
  ];
  const ignoredTopLevel = new Set(['node_modules']);

  async function visit(directory, depth = 0, _relativePrefix = '') {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (depth === 0 && ignoredTopLevel.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, '/');
      if (entry.isDirectory()) {
        await visit(absolutePath, depth + 1, relativePath);
      } else {
        if (ignoredPrefixes.some((prefix) => relativePath.startsWith(prefix))) continue;
        const content = await fs.readFile(absolutePath);
        entries.push(`${relativePath}:${createHash('sha256').update(content).digest('hex')}`);
      }
    }
  }

  await visit(root);
  return entries.sort().join('\n');
}

async function main() {
  await runPackedExampleValidation({
    tempPrefix: 'qa-flowkit-manual-example-',
    exampleRoot,
    structuralMessage: 'Manual-only public example passed packed install and strict validation.',
    validate: async ({ cli, targetRoot }) => {
      const originalDigest = await digestTree(targetRoot);

      runPackedInit(cli, targetRoot, 'manual-only');

      const afterInitDigest = await digestTree(targetRoot);
      if (afterInitDigest !== originalDigest) {
        throw new Error('Packed init modified canonical example artifacts.');
      }

      run(node, [cli, 'doctor', '--strict'], { cwd: targetRoot });
      runPackedValidateTarget(cli, targetRoot);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
