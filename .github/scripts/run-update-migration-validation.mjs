#!/usr/bin/env node
/**
 * E2E-05: update from oldest-supported-beta fixture while preserving config, artifacts and active run state.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'migration', 'oldest-supported-beta');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';
const MARKER = 'QA_FLOWKIT_MIGRATION_FIXTURE_MARKER';

function run(command, args, { cwd, env = {}, expectFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
      ...env
    }
  });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(
      [
        `Command ${expectFailure ? 'succeeded unexpectedly' : 'failed'}: ${command} ${args.join(' ')}`,
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

function runNpm(args, options = {}) {
  if (npmExecPath) return run(node, [npmExecPath, ...args], options);
  return run(npmCommand, args, { ...options, shell: process.platform === 'win32' });
}

function parsePackOutput(stdout) {
  const start = stdout.indexOf('[');
  const payload = JSON.parse(stdout.slice(start));
  return Array.isArray(payload) ? payload[0] : payload;
}

function cliPath(targetRoot) {
  return path.join(targetRoot, 'node_modules', 'qa-flowkit', 'bin', 'qa-flowkit.mjs');
}

function runCli(targetRoot, args, options = {}) {
  return run(node, [cliPath(targetRoot), ...args], { cwd: targetRoot, ...options });
}

async function sha256File(filePath) {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function assertExists(filePath, label = filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Expected ${label} to exist.`);
  }
}

async function assertMissing(filePath, label = filePath) {
  try {
    await fs.access(filePath);
    throw new Error(`Expected ${label} to be absent.`);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}

async function copyFixtureTree(relativePath, targetRoot) {
  const source = path.join(fixtureRoot, relativePath);
  const target = path.join(targetRoot, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await fs.cp(source, target, { recursive: true, force: true });
  } else {
    await fs.copyFile(source, target);
  }
}

function parseJsonStdout(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} did not return JSON:\n${result.stdout}\n${result.stderr}`);
  }
}

async function overlayOldestSupportedFixture(targetRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(fixtureRoot, 'manifest.v1.json'), 'utf8'));
  for (const relativePath of manifest.paths) {
    await copyFixtureTree(relativePath, targetRoot);
  }

  const agentsPath = path.join(targetRoot, 'AGENTS.md');
  try {
    await fs.access(agentsPath);
    const agents = await fs.readFile(agentsPath, 'utf8');
    if (!agents.includes(MARKER)) {
      await fs.writeFile(agentsPath, `${agents.trimEnd()}\n\n<!-- ${MARKER} -->\n`, 'utf8');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fs.writeFile(path.join(targetRoot, '.qa-ai', 'obsolete-framework-marker.txt'), 'remove-on-update\n', 'utf8');
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(repoRoot, '.qa-flowkit-update-migration-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');

  try {
    await fs.mkdir(packDir, { recursive: true });
    await fs.mkdir(npmCache, { recursive: true });
    await fs.mkdir(targetRoot, { recursive: true });

    const packResult = runNpm(['pack', '--pack-destination', packDir, '--json'], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });
    const packInfo = parsePackOutput(packResult.stdout);
    const tarball = path.join(packDir, packInfo.filename);
    await assertExists(tarball, 'packed tarball');

    runNpm(['install', '--prefix', targetRoot, '--ignore-scripts', '--package-lock=false', '--no-save', tarball], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });

    runCli(targetRoot, ['init', '--preset', 'manual-only', '--adapters', 'generic', '--skip-doctor']);
    await overlayOldestSupportedFixture(targetRoot);

    const before = {
      config: await sha256File(path.join(targetRoot, 'qa-ai.config.yaml')),
      artifact: await sha256File(path.join(targetRoot, 'qa-ai-output', 'user-preserved-artifact.md')),
      feature: await sha256File(path.join(targetRoot, 'features', 'functional', 'RF-101-TC-001-login.feature')),
      profile: await sha256File(path.join(targetRoot, '.qa-ai', 'config-profiles', 'team-profile.yaml')),
      stateMarker: await sha256File(path.join(targetRoot, '.qa-ai', 'state', 'preserved-marker.json')),
      agents: await sha256File(path.join(targetRoot, 'AGENTS.md'))
    };

    runCli(targetRoot, ['run', 'start', '--rf', 'RF-101', '--json']);
    runCli(targetRoot, ['run', 'next', '--json']);
    const activePointerPath = path.join(targetRoot, '.qa-ai', 'state', 'runs', 'active.json');
    const activeBefore = await fs.readFile(activePointerPath, 'utf8');
    const activeRunId = JSON.parse(activeBefore).runId;
    const runSnapshotBefore = await sha256File(
      path.join(targetRoot, '.qa-ai', 'state', 'runs', activeRunId, 'run.json')
    );

    const dryRunPlan = parseJsonStdout(runCli(targetRoot, ['update', '--dry-run', '--json']), 'update dry-run');
    assert.equal(dryRunPlan.schemaVersion, 1);
    assert.ok(dryRunPlan.legacyConfigKeys.length > 0, 'expected legacy config keys in dry-run plan');
    assert.ok(dryRunPlan.preservedPaths.some((item) => item.includes('state')));

    runCli(targetRoot, ['update', '--skip-doctor']);
    await assertMissing(path.join(targetRoot, '.qa-ai', 'obsolete-framework-marker.txt'), 'obsolete framework marker');
    assert.equal(await fs.readFile(activePointerPath, 'utf8'), activeBefore, 'active run pointer changed after update');
    assert.equal(
      await sha256File(path.join(targetRoot, '.qa-ai', 'state', 'runs', activeRunId, 'run.json')),
      runSnapshotBefore
    );

    for (const [label, hash] of Object.entries(before)) {
      const currentPath =
        label === 'config'
          ? 'qa-ai.config.yaml'
          : label === 'artifact'
            ? 'qa-ai-output/user-preserved-artifact.md'
            : label === 'feature'
              ? 'features/functional/RF-101-TC-001-login.feature'
              : label === 'profile'
                ? '.qa-ai/config-profiles/team-profile.yaml'
                : label === 'stateMarker'
                  ? '.qa-ai/state/preserved-marker.json'
                  : 'AGENTS.md';
      assert.equal(await sha256File(path.join(targetRoot, currentPath)), hash, `${label} changed after first update`);
    }

    const configText = await fs.readFile(path.join(targetRoot, 'qa-ai.config.yaml'), 'utf8');
    assert.match(configText, /allowInferredAcceptanceCriteria:\s*true/);
    runCli(targetRoot, ['validate-config']);

    const status = parseJsonStdout(runCli(targetRoot, ['run', 'status', '--json']), 'run status after update');
    assert.equal(status.active, true);
    assert.equal(status.runId, activeRunId);

    runCli(targetRoot, ['update', '--skip-doctor']);
    for (const [label, hash] of Object.entries(before)) {
      const currentPath =
        label === 'config'
          ? 'qa-ai.config.yaml'
          : label === 'artifact'
            ? 'qa-ai-output/user-preserved-artifact.md'
            : label === 'feature'
              ? 'features/functional/RF-101-TC-001-login.feature'
              : label === 'profile'
                ? '.qa-ai/config-profiles/team-profile.yaml'
                : label === 'stateMarker'
                  ? '.qa-ai/state/preserved-marker.json'
                  : 'AGENTS.md';
      assert.equal(await sha256File(path.join(targetRoot, currentPath)), hash, `${label} changed after second update`);
    }

    console.log('Update migration validation passed (E2E-05).');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
