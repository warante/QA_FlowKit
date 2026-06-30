#!/usr/bin/env node
/**
 * E2E-06: packed tarball install in a clean directory and all primary stable CLI commands.
 * Uses isolated temp paths (including spaces and non-ASCII) without source-repository fallbacks.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';
import {
  assertExists,
  installPackTarball,
  isMain,
  node,
  repoRoot,
  resolvePackTarball,
  run,
  runCli
} from './lib/ci-helpers.mjs';

async function packTarball(packDir, npmCache) {
  const { tarball, fromArtifact, packInfo } = await resolvePackTarball({ packDir, npmCache });
  if (!fromArtifact && packInfo) {
    validatePackFileList(packInfo.files);
  }
  return tarball;
}

function runScript(targetRoot, scriptRelative, args = [], options = {}) {
  return run(node, [path.join(targetRoot, scriptRelative), ...args], { cwd: targetRoot, ...options });
}

async function installPackedCli(targetRoot, tarball, npmCache) {
  await fs.mkdir(targetRoot, { recursive: true });
  installPackTarball(targetRoot, tarball, { npmCache });
}

async function extractTarball(tarball, extractDir) {
  await fs.mkdir(extractDir, { recursive: true });
  run('tar', ['-xzf', path.basename(tarball), '-C', extractDir], { cwd: path.dirname(tarball) });
  const packageDir = path.join(extractDir, 'package');
  await assertExists(packageDir, 'extracted package directory');
  return packageDir;
}

async function writeMinimalFeature(targetRoot) {
  const featureDir = path.join(targetRoot, '.qa-ai', 'features', 'manual');
  await fs.mkdir(featureDir, { recursive: true });
  await fs.writeFile(
    path.join(featureDir, 'RF-101-clean-install.feature'),
    `@priority:medium @type:functional @manual:yes @rf:RF-101 @id:TC-101
Feature: Clean install smoke

  Acceptance Criteria:
    AC-1: Packed install works

  Scenario: RF-101 Packed CLI smoke
    Given the packed CLI is installed
    When I run doctor
    Then the command exits successfully
`,
    'utf8'
  );
}

async function assertPrimaryCommandsFromTarballInstall(targetRoot) {
  const version = runCli(targetRoot, ['version']).stdout.trim();
  assert.ok(/^\d+\.\d+\.\d+/.test(version), 'version should print semver');

  runCli(targetRoot, ['init', '--skip-doctor']);
  await assertExists(path.join(targetRoot, '.qa-ai', 'qa-ai.config.yaml'), 'generated compact config');
  assert.equal(
    await fs
      .access(path.join(targetRoot, 'qa-ai.config.yaml'))
      .then(() => true)
      .catch(() => false),
    false,
    'root qa-ai.config.yaml should not exist after compact init'
  );
  await assertExists(path.join(targetRoot, '.qa-ai', 'scripts', 'init.mjs'), 'framework copy');
  runCli(targetRoot, ['init', '--skip-doctor'], { expectFailure: true });

  const helpJson = JSON.parse(runCli(targetRoot, ['help', '--json']).stdout);
  assert.equal(typeof helpJson.initialized, 'boolean');

  runCli(targetRoot, ['doctor']);
  runCli(targetRoot, ['validate-config']);
  JSON.parse(runCli(targetRoot, ['validate-config', '--json']).stdout);

  runCli(targetRoot, ['validate-untrusted-content', '--allow-missing']);
  runCli(targetRoot, ['validate-external-intake', '--allow-missing']);
  runCli(targetRoot, ['validate-features', '--allow-empty']);
  runCli(targetRoot, ['validate-karate-features', '--allow-empty']);
  runCli(targetRoot, ['validate-maestro-flows', '--allow-empty']);
  runCli(targetRoot, ['validate-traceability', '--allow-empty', '--allow-missing']);
  runCli(targetRoot, ['validate-sync-plan', '--allow-empty', '--allow-missing']);
  runCli(targetRoot, ['validate-sync-diff', '--allow-empty', '--allow-missing']);
  runCli(targetRoot, ['validate-sync-result', '--allow-empty', '--allow-missing']);
  runCli(targetRoot, ['validate-active-specialists', '--allow-missing']);
  runCli(targetRoot, ['validate-release-gate', '--allow-missing']);
  runCli(targetRoot, ['validate-test-design', '--allow-missing']);
  runCli(targetRoot, ['validate-test-coverage', '--allow-empty', '--allow-missing']);
  runCli(targetRoot, ['validate-quality-report', '--allow-missing']);
  runCli(targetRoot, ['validate-target', '--allow-empty', '--allow-missing', '--no-strict-doctor']);

  runCli(targetRoot, ['run', 'start']);
  JSON.parse(runCli(targetRoot, ['run', 'status', '--json']).stdout);
  runCli(targetRoot, ['run', 'next']);
  runCli(targetRoot, ['run', 'check'], { expectFailure: true });
  runCli(targetRoot, ['run', 'check'], { expectFailure: true });
  const blockedCheck = runCli(targetRoot, ['run', 'check', '--json'], { expectFailure: true });
  const blockedPayload = JSON.parse(blockedCheck.stdout);
  assert.equal(blockedPayload.retryable, true, 'validation block should be retryable');
  runCli(targetRoot, ['run', 'retry']);

  runCli(targetRoot, ['config', '--export', '.qa-ai/config-profiles/e2e-export.yaml']);
  await assertExists(path.join(targetRoot, '.qa-ai', 'config-profiles', 'e2e-export.yaml'), 'config export');

  runCli(targetRoot, ['bootstrap', '--agents', 'none']);
  runCli(targetRoot, ['sync-adapters', '--adapters', 'generic', '--force']);
  runCli(targetRoot, ['update', '--dry-run', '--json']);
  runCli(targetRoot, ['metrics', '--json']);
  runCli(targetRoot, ['clean']);

  await writeMinimalFeature(targetRoot);
  runCli(targetRoot, [
    'export-report',
    '--format',
    'cucumber-json',
    '--out',
    '.qa-ai/output/reports/cucumber',
    '--json'
  ]);
  runCli(targetRoot, ['help']);
  runCli(targetRoot, ['unknown-command-xyzzy'], { expectFailure: true });
}

async function assertFolderCopyOfflineFlow(packageDir, workspaceRoot) {
  await fs.mkdir(workspaceRoot, { recursive: true });
  await fs.cp(path.join(packageDir, '.qa-ai'), path.join(workspaceRoot, '.qa-ai'), { recursive: true });

  runScript(workspaceRoot, '.qa-ai/scripts/init.mjs', ['--no-adapters', '--skip-doctor']);
  await assertExists(path.join(workspaceRoot, '.qa-ai', 'qa-ai.config.yaml'), 'folder-copy compact config');
  runScript(workspaceRoot, '.qa-ai/scripts/doctor.mjs');
  runScript(workspaceRoot, '.qa-ai/scripts/bootstrap-agent-adapters.mjs', ['--agents', 'none']);
  runScript(workspaceRoot, '.qa-ai/scripts/validate-config.mjs');
  runScript(workspaceRoot, '.qa-ai/scripts/qa-help.mjs', ['--json']);
}

export async function runCleanInstallValidation({ root = repoRoot } = {}) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-e2e06-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const installRoot = path.join(tempRoot, 'Usuario Prueba', 'tést QA');
  const folderCopyRoot = path.join(tempRoot, 'Copia carpeta', 'sin npm');

  try {
    const tarball = await packTarball(packDir, npmCache);
    const packageDir = await extractTarball(tarball, path.join(tempRoot, 'extracted'));

    await installPackedCli(installRoot, tarball, npmCache);
    await assertPrimaryCommandsFromTarballInstall(installRoot);
    await assertFolderCopyOfflineFlow(packageDir, folderCopyRoot);

    return { ok: true, version: runCli(installRoot, ['version']).stdout.trim(), root };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  await runCleanInstallValidation();
  console.log('E2E-06 clean install validation passed.');
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
