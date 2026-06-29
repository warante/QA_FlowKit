#!/usr/bin/env node
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
import { executeKarate } from './lib/karate-runtime.mjs';

const exampleRoot = path.join(repoRoot, 'examples', 'karate-full');
const runRuntime = process.argv.includes('--runtime');

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-karate-example-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');

  try {
    await fs.mkdir(npmCache, { recursive: true });
    await fs.cp(exampleRoot, targetRoot, { recursive: true });

    const { tarball } = await resolvePackTarball({ packDir, npmCache });
    installPackTarball(targetRoot, tarball, { npmCache });

    const cli = cliPath(targetRoot);
    run(node, [cli, 'init', '--preset', 'karate-full', '--no-adapters', '--skip-doctor'], { cwd: targetRoot });
    run(node, [cli, 'validate-target'], { cwd: targetRoot });

    if (runRuntime) {
      await executeKarate({
        targetRoot,
        tempRoot,
        serverEntry: 'app/server.mjs',
        healthPath: '/api/profile',
        karatePaths: ['tests/karate/features/api', 'tests/karate/features/ui']
      });
      console.log('Karate public example passed packed install, strict validation and runtime execution.');
    } else {
      console.log('Karate public example passed packed install and strict structural validation.');
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
