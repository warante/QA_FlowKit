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

const exampleRoot = path.join(repoRoot, 'examples', 'maestro-karate-mobile');
const runRuntime = process.argv.includes('--runtime');

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-mobile-example-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');
  const cliRoot = path.join(tempRoot, 'cli');

  try {
    await fs.mkdir(npmCache, { recursive: true });
    await fs.cp(exampleRoot, targetRoot, { recursive: true });

    const { tarball } = await resolvePackTarball({ packDir, npmCache });
    await fs.mkdir(cliRoot, { recursive: true });
    installPackTarball(cliRoot, tarball, { npmCache });

    const cli = cliPath(cliRoot);
    run(
      node,
      [
        cli,
        'init',
        '--preset',
        'maestro-karate-mobile',
        '--set',
        'automation.mobile.appId=com.example.qaflowkit',
        '--no-adapters',
        '--skip-doctor'
      ],
      { cwd: targetRoot }
    );
    run(node, [cli, 'validate-target'], { cwd: targetRoot });

    if (runRuntime) {
      await executeKarate({
        targetRoot,
        tempRoot,
        serverEntry: 'app/server.mjs',
        healthPath: '/api/accounts/demo/balance',
        karatePaths: ['tests/karate/features/api']
      });
      console.log('Mobile reference passed packed install, strict validation and Karate API execution.');
    } else {
      console.log('Mobile reference passed packed install and strict structural validation.');
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
