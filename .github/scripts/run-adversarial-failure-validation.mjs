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

function parseJsonObjectFromOutput(output) {
  const start = output.indexOf('{');
  assert.notEqual(start, -1, `No JSON object found in output:\n${output}`);
  return JSON.parse(output.slice(start));
}

async function initTarget(prefix = 'qa-flowkit-adversarial-') {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  runCli(target, ['init', '--preset', 'manual-only', '--skip-doctor', '--no-adapters']);
  return target;
}

async function replaceConfigValue(cwd, search, replacement) {
  const configPath = path.join(cwd, 'qa-ai.config.yaml');
  const content = await fs.readFile(configPath, 'utf8');
  assert.ok(content.includes(search), `Config did not contain expected text: ${search}`);
  await fs.writeFile(configPath, content.replace(search, replacement), 'utf8');
}

async function assertSymlinkEscapeRejected() {
  const target = await initTarget();
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-outside-'));
  try {
    const linkPath = path.join(target, 'features-linked');
    try {
      await fs.symlink(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        console.log(`[SKIP] symlink/junction escape check (${error.code})`);
        return;
      }
      throw error;
    }

    await replaceConfigValue(target, 'featurePath: features', 'featurePath: features-linked');
    const result = runCli(target, ['run', 'start', '--rf', 'RF-LINK'], { expectFailure: true });
    assert.match(`${result.stdout}\n${result.stderr}`, /inside the repository|must stay/i);
  } finally {
    await fs.rm(target, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
}

async function assertPathTraversalRejected() {
  const target = await initTarget();
  try {
    await replaceConfigValue(target, 'featurePath: features', 'featurePath: ../outside');
    const result = runCli(target, ['run', 'start', '--rf', 'RF-PATH'], { expectFailure: true });
    assert.match(`${result.stdout}\n${result.stderr}`, /inside the repository|must stay/i);
  } finally {
    await fs.rm(target, { recursive: true, force: true });
  }
}

async function assertSecretScanFailsWithoutLeakingValue() {
  const target = await initTarget();
  const secret = 'ghp_abcdefghijklmnopqrstuvwxyz1234567890abcd';
  try {
    await fs.mkdir(path.join(target, 'qa-ai-output'), { recursive: true });
    await fs.writeFile(path.join(target, 'qa-ai-output', 'requirement-analysis.md'), `operator token: ${secret}\n`);
    const result = runCli(
      target,
      [
        'validate-target',
        '--allow-empty',
        '--allow-missing',
        '--no-strict-doctor',
        '--skip-test-design',
        '--scan-secrets'
      ],
      { expectFailure: true }
    );
    const output = `${result.stdout}\n${result.stderr}`;
    assert.match(output, /secret scan|potential secret/i);
    assert.match(output, /\[REDACTED\]/);
    assert.ok(!output.includes(secret), 'secret value must not be printed in validator output');
  } finally {
    await fs.rm(target, { recursive: true, force: true });
  }
}

async function assertMalformedContractFailsDoctor() {
  const target = await initTarget();
  try {
    await fs.writeFile(path.join(target, '.qa-ai', 'contracts', 'workflow.v1.json'), '{"schemaVersion":1}\n');
    const result = runCli(target, ['doctor'], { expectFailure: true });
    assert.match(`${result.stdout}\n${result.stderr}`, /workflow contract/i);
  } finally {
    await fs.rm(target, { recursive: true, force: true });
  }
}

async function assertCorruptActiveStateDoesNotBreakHelp() {
  const target = await initTarget();
  try {
    await fs.mkdir(path.join(target, '.qa-ai', 'state', 'runs'), { recursive: true });
    await fs.writeFile(path.join(target, '.qa-ai', 'state', 'runs', 'active.json'), '{not-json\n');
    const result = runCli(target, ['help', '--json']);
    const payload = parseJsonObjectFromOutput(result.stdout);
    assert.equal(payload.activeRun, null);
    assert.ok(Array.isArray(payload.recommendations));
  } finally {
    await fs.rm(target, { recursive: true, force: true });
  }
}

async function assertCleanDoesNotDeleteWithoutForceAndSkipsUnsafeManifestPath() {
  const target = await initTarget();
  try {
    const generatedPath = path.join(target, 'qa-ai-output', 'generated.md');
    await fs.writeFile(generatedPath, '# generated\n');
    await fs.mkdir(path.join(target, '.qa-ai', 'state'), { recursive: true });
    await fs.writeFile(
      path.join(target, '.qa-ai', 'state', 'init-manifest.json'),
      `${JSON.stringify(
        {
          version: 1,
          entries: [
            {
              path: 'qa-ai-output/generated.md',
              type: 'file',
              category: 'generated',
              source: 'test'
            },
            {
              path: '../outside.md',
              type: 'file',
              category: 'generated',
              source: 'test'
            }
          ]
        },
        null,
        2
      )}\n`
    );

    const dryRun = runCli(target, ['clean', '--generated']);
    assert.match(dryRun.stdout, /WOULD DELETE FILE/);
    await fs.access(generatedPath);

    const forced = runCli(target, ['clean', '--generated', '--force']);
    assert.match(forced.stdout, /unsafe manifest path|outside repository root/i);
    await assert.rejects(() => fs.access(generatedPath));
  } finally {
    await fs.rm(target, { recursive: true, force: true });
  }
}

async function main() {
  await assertPathTraversalRejected();
  await assertSymlinkEscapeRejected();
  await assertSecretScanFailsWithoutLeakingValue();
  await assertMalformedContractFailsDoctor();
  await assertCorruptActiveStateDoesNotBreakHelp();
  await assertCleanDoesNotDeleteWithoutForceAndSkipsUnsafeManifestPath();
  console.log('Adversarial failure-path E2E passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
