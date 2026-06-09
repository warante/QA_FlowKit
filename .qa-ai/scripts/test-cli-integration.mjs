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
    const coverageJson = runCli(tempRoot, ['validate-test-coverage', '--allow-empty', '--allow-missing', '--json']);
    JSON.parse(coverageJson.stdout);
    runCli(tempRoot, ['validate-active-specialists', '--allow-missing']);
    runCli(tempRoot, ['run', 'start', '--rf', 'RF-CLI-INT']);
    const statusJson = runCli(tempRoot, ['run', 'status', '--json']);
    const statusPayload = JSON.parse(statusJson.stdout);
    assert.ok(statusPayload.runId, 'run status --json should include runId');

    const contractScript = path.join(repoRoot, '.qa-ai', 'scripts', 'validate-workflow-contract.mjs');
    const contractJson = spawnSync(node, [contractScript, '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: false
    });
    assert.equal(contractJson.status, 0);
    JSON.parse(contractJson.stdout.trim());

    await fs.writeFile(path.join(tempRoot, 'qa-ai-output', 'requirement-analysis.md'), '# original\n', 'utf8');
    runCli(tempRoot, ['run', 'next']);
    const activeRun = JSON.parse(runCli(tempRoot, ['run', 'status', '--json']).stdout);
    runCli(tempRoot, ['run', 'resume', activeRun.runId]);
    await fs.writeFile(path.join(tempRoot, 'qa-ai-output', 'requirement-analysis.md'), '# modified\n', 'utf8');
    const blockedStatus = JSON.parse(runCli(tempRoot, ['run', 'status', '--json']).stdout);
    assert.ok(blockedStatus.blockers.some((item) => item.type === 'modification'));

    const checkJson = runCli(tempRoot, ['run', 'check', '--json'], { expectFailure: true });
    const checkPayload = JSON.parse(checkJson.stdout);
    assert.equal(checkPayload.ok, false);
    assert.ok(checkJson.stderr === '' || checkJson.stderr.trim() === '');

    await fs.writeFile(path.join(tempRoot, '.qa-ai', 'contracts', 'workflow.v1.json'), '{"schemaVersion":1}\n');
    const brokenDoctor = spawnSync(node, [cli, 'doctor'], {
      cwd: tempRoot,
      encoding: 'utf8',
      shell: false
    });
    assert.notEqual(brokenDoctor.status, 0);

    console.log('CLI integration tests passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
