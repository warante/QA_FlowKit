#!/usr/bin/env node
/**
 * E2E-09: release dry-run — pack verification, dist-tag policy and post-publish install smoke (no npm publish).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveNpmDistTag, simulateRegistryVisibilityCheck } from './lib/npm-dist-tag.mjs';
import { verifyReleasePolicy } from './verify-release-policy.mjs';
import { isMain, packAndInstall, repoRoot, runCli } from './lib/ci-helpers.mjs';

async function packAndInstallSmoke(tempRoot) {
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const installRoot = path.join(tempRoot, 'post-publish-install');
  const install = await packAndInstall({
    packDir,
    npmCache,
    installRoot,
    validateAllowlist: true
  });

  const version = runCli(installRoot, ['version']).stdout.trim();
  assert.match(version, /^\d+\.\d+\.\d+/, 'packed install must expose semver version');
  runCli(installRoot, ['init', '--skip-doctor', '--no-adapters']);
  runCli(installRoot, ['doctor']);
  runCli(installRoot, ['validate-config', '--json']);

  return { version, tarball: install.filename };
}

export async function runReleaseDryRunValidation({ root = repoRoot } = {}) {
  const policy = await verifyReleasePolicy({ root });
  assert.equal(policy.ok, true, policy.errors.join('\n'));

  assert.equal(resolveNpmDistTag('1.0.0-rc.1'), 'rc');
  assert.equal(resolveNpmDistTag('1.0.0'), 'latest');

  const retryOk = simulateRegistryVisibilityCheck(['', '', '1.0.0-rc.1'], '1.0.0-rc.1');
  assert.equal(retryOk.ok, true);
  assert.equal(retryOk.attempts, 3);

  const retryFail = simulateRegistryVisibilityCheck(['', ''], '1.0.0-rc.1');
  assert.equal(retryFail.ok, false);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-e2e09-'));
  try {
    const install = await packAndInstallSmoke(tempRoot);
    return { ok: true, version: install.version, tarball: install.tarball };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  const result = await runReleaseDryRunValidation();
  console.log(`E2E-09 release dry-run validation passed (packed ${result.version}, ${result.tarball}).`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
