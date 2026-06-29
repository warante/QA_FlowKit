#!/usr/bin/env node
/**
 * TASK-083 rehearsal: validate prepared stable release-please policy and latest dist-tag smoke.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveNpmDistTag } from './lib/npm-dist-tag.mjs';
import { isPreparedStablePolicy, STABLE_CONFIG } from './lib/stable-release-config.mjs';
import { verifyStableReleaseConfig } from './verify-stable-release-config.mjs';
import { isMain, packAndInstall, repoRoot, runCli } from './lib/ci-helpers.mjs';

async function packAndInstallSmoke(tempRoot) {
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const installRoot = path.join(tempRoot, 'stable-rehearsal-install');
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

export async function runStableConfigRehearsal({ root = repoRoot } = {}) {
  const config = await verifyStableReleaseConfig({ root });
  assert.equal(config.ok, true, config.errors.join('\n'));

  const stableConfig = JSON.parse(await fs.readFile(path.join(root, STABLE_CONFIG), 'utf8'));
  assert.equal(isPreparedStablePolicy(stableConfig), true, 'stable config file must disable prerelease');
  assert.equal(resolveNpmDistTag('1.0.0'), 'latest');
  assert.equal(resolveNpmDistTag('1.0.0-rc.1'), 'rc');

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-stable-config-rehearsal-'));
  try {
    const install = await packAndInstallSmoke(tempRoot);
    return { ok: true, version: install.version, tarball: install.tarball, configStatus: config.status };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  const result = await runStableConfigRehearsal();
  console.log(
    `Stable config rehearsal passed (configStatus=${result.configStatus}, packed ${result.version}, ${result.tarball}).`
  );
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
