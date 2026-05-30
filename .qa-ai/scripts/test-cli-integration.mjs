#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(repoRoot, 'bin', 'qa-flowkit.mjs');
const node = process.execPath;

function runCli(cwd, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    shell: false
  });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(
      [
        `qa-flowkit ${args.join(' ')} ${expectFailure ? 'succeeded unexpectedly' : 'failed'}`,
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-cli-int-'));
  try {
    const version = runCli(repoRoot, ['version']);
    assert.ok(version.stdout.trim(), 'version should print output');

    const helpJson = runCli(repoRoot, ['help', '--json']);
    assert.ok(helpJson.stdout.includes('"recommendations"'), 'help --json should include workflow recommendations');

    runCli(tempRoot, ['unknown-command-xyzzy'], { expectFailure: true });

    runCli(tempRoot, ['init', '--skip-doctor']);
    runCli(tempRoot, ['validate-features', '--allow-empty']);
    runCli(tempRoot, ['validate-active-specialists', '--allow-missing']);

    console.log('CLI integration tests passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
