import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parsePackOutput, validatePackFileList } from '../../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';
import { resolveNpmDistTag, simulateRegistryVisibilityCheck } from './npm-dist-tag.mjs';
import { assertRcVersion, parseDistTagsJson } from './rc-version.mjs';
import { assertStableVersion } from './stable-version.mjs';
import { node, npmCommand, npmExecPath, parseJsonStdout, repoRoot, runCli, runNpm } from './ci-helpers.mjs';
import { overlayOldestSupportedFixture } from './migration-fixture.mjs';

const CHANNELS = {
  stable: {
    versionEnvVar: 'QA_FLOWKIT_STABLE_VERSION',
    assertVersion: assertStableVersion,
    versionRequiredMessage: 'Pass --version 1.0.0 or set QA_FLOWKIT_STABLE_VERSION',
    distTag: 'latest',
    tempPrefix: 'qa-stable-post-publish-',
    localSimulationDistTagExample: '1.0.0',
    verifyLatestView: true,
    verifyPackAllowlist: true,
    useLatestTagOnInstall: true,
    label: 'Stable'
  },
  rc: {
    versionEnvVar: 'QA_FLOWKIT_RC_VERSION',
    assertVersion: assertRcVersion,
    versionRequiredMessage: 'Pass --version 1.0.0-rc.N or set QA_FLOWKIT_RC_VERSION',
    distTag: 'rc',
    tempPrefix: 'qa-rc-post-publish-',
    localSimulationDistTagExample: '1.0.0-rc.1',
    verifyLatestView: false,
    verifyPackAllowlist: false,
    useLatestTagOnInstall: false,
    label: 'RC'
  }
};

export function parsePostPublishArgs(argv, { versionEnvVar }) {
  const args = { localSimulation: false, version: process.env[versionEnvVar] || '' };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--local-simulation') args.localSimulation = true;
    if (argv[index] === '--version' && argv[index + 1]) {
      args.version = argv[++index];
    }
  }
  return args;
}

async function verifyRegistryMetadata(version, npmCache, { distTag, verifyLatestView }) {
  const attempts = [];
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const result = spawnSync(
      npmExecPath ? node : npmCommand,
      npmExecPath
        ? [npmExecPath, 'view', `qa-flowkit@${version}`, 'version']
        : ['view', `qa-flowkit@${version}`, 'version'],
      {
        encoding: 'utf8',
        shell: process.platform === 'win32' && !npmExecPath,
        env: {
          ...process.env,
          npm_config_audit: 'false',
          npm_config_cache: npmCache
        }
      }
    );
    const seen = String(result.stdout || '').trim();
    attempts.push(seen);
    if (result.status === 0 && seen === version) break;
  }

  const visibility = simulateRegistryVisibilityCheck(attempts, version);
  assert.equal(visibility.ok, true, `npm registry did not expose ${version}; last=${visibility.published}`);

  if (verifyLatestView) {
    const latestView = runNpm(['view', 'qa-flowkit@latest', 'version'], {
      env: { npm_config_cache: npmCache }
    });
    assert.equal(String(latestView.stdout || '').trim(), version, `qa-flowkit@latest must resolve to ${version}`);
  }

  const tagsResult = runNpm(['view', 'qa-flowkit', 'dist-tags', '--json'], {
    env: { npm_config_cache: npmCache }
  });
  const tags = parseDistTagsJson(tagsResult.stdout);
  assert.equal(tags[distTag], version, `dist-tag ${distTag} must point to ${version}, got ${tags[distTag]}`);
  assert.equal(resolveNpmDistTag(version), distTag);
}

async function assertRegistryPackAllowlist(version, npmCache, tempRoot) {
  const packDir = path.join(tempRoot, 'registry-pack');
  await fs.mkdir(packDir, { recursive: true });
  const packResult = runNpm(['pack', `qa-flowkit@${version}`, '--pack-destination', packDir, '--json'], {
    cwd: repoRoot,
    env: { npm_config_cache: npmCache }
  });
  const packInfo = parsePackOutput(packResult.stdout);
  validatePackFileList(packInfo.files);
  return packInfo.filename;
}

async function installPackage({ version, localSimulation, installRoot, npmCache, useLatestTag = false }) {
  await fs.mkdir(installRoot, { recursive: true });
  if (localSimulation) {
    const packDir = path.join(installRoot, '..', 'pack');
    await fs.mkdir(packDir, { recursive: true });
    const packResult = runNpm(['pack', '--pack-destination', packDir, '--json'], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });
    const packInfo = parsePackOutput(packResult.stdout);
    validatePackFileList(packInfo.files);
    const tarball = path.join(packDir, packInfo.filename);
    runNpm(['install', '--prefix', installRoot, '--ignore-scripts', '--package-lock=false', '--no-save', tarball], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });
    return packInfo.filename;
  }

  const spec = useLatestTag ? 'qa-flowkit@latest' : `qa-flowkit@${version}`;
  runNpm(['install', '--prefix', installRoot, '--ignore-scripts', '--package-lock=false', '--no-save', spec], {
    cwd: repoRoot,
    env: { npm_config_cache: npmCache }
  });
  return spec;
}

async function assertCleanInstallSmoke(installRoot) {
  const version = runCli(installRoot, ['version']).stdout.trim();
  assert.match(version, /^\d+\.\d+\.\d+/, 'version must print semver');

  runCli(installRoot, ['init', '--skip-doctor', '--no-adapters']);
  runCli(installRoot, ['doctor']);
  parseJsonStdout(runCli(installRoot, ['validate-config', '--json']), 'validate-config');
  parseJsonStdout(runCli(installRoot, ['help', '--json']), 'help');

  runCli(installRoot, ['run', 'start']);
  const status = parseJsonStdout(runCli(installRoot, ['run', 'status', '--json']), 'run status');
  assert.equal(status.active, true);
}

async function assertPublishedUpdateSmoke(tempRoot, npmCache, { localSimulation, version, useLatestTagOnInstall }) {
  const migrationRoot = path.join(tempRoot, 'migration-target');
  await installPackage({
    version,
    localSimulation,
    installRoot: migrationRoot,
    npmCache,
    useLatestTag: useLatestTagOnInstall && !localSimulation
  });

  runCli(migrationRoot, ['init', '--preset', 'manual-only', '--adapters', 'generic', '--skip-doctor']);
  await overlayOldestSupportedFixture(migrationRoot);

  const configBefore = await fs.readFile(path.join(migrationRoot, 'qa-ai.config.yaml'), 'utf8');
  runCli(migrationRoot, ['run', 'start', '--rf', 'RF-101', '--json']);
  const activeBefore = await fs.readFile(path.join(migrationRoot, '.qa-ai', 'state', 'runs', 'active.json'), 'utf8');

  const dryRun = parseJsonStdout(runCli(migrationRoot, ['update', '--dry-run', '--json']), 'update dry-run');
  assert.equal(dryRun.schemaVersion, 1);
  assert.ok(dryRun.legacyConfigKeys.length > 0);

  runCli(migrationRoot, ['update', '--skip-doctor']);
  assert.equal(await fs.readFile(path.join(migrationRoot, 'qa-ai.config.yaml'), 'utf8'), configBefore);
  assert.equal(
    await fs.readFile(path.join(migrationRoot, '.qa-ai', 'state', 'runs', 'active.json'), 'utf8'),
    activeBefore
  );
  await fs.access(path.join(migrationRoot, 'qa-ai-output', 'user-preserved-artifact.md'));
}

export async function runPostPublishValidation(channel, options = {}) {
  const config = CHANNELS[channel];
  if (!config) {
    throw new Error(`Unknown post-publish channel: ${channel}`);
  }

  const args = { ...parsePostPublishArgs(process.argv, config), ...options };
  const localSimulation = Boolean(args.localSimulation);
  let effectiveVersion = String(args.version || '').trim();

  if (localSimulation) {
    if (!effectiveVersion) {
      effectiveVersion = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8')).version;
    }
  } else {
    assert.ok(effectiveVersion, config.versionRequiredMessage);
    config.assertVersion(effectiveVersion);
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), config.tempPrefix));
  const npmCache = path.join(tempRoot, 'npm-cache');
  const installRoot = path.join(tempRoot, 'clean-install');

  try {
    let packSource = '';
    if (!localSimulation) {
      await verifyRegistryMetadata(effectiveVersion, npmCache, {
        distTag: config.distTag,
        verifyLatestView: config.verifyLatestView
      });
      if (config.verifyPackAllowlist) {
        packSource = await assertRegistryPackAllowlist(effectiveVersion, npmCache, tempRoot);
      }
    } else {
      assert.equal(resolveNpmDistTag(config.localSimulationDistTagExample), config.distTag);
    }

    const source = await installPackage({
      version: effectiveVersion,
      localSimulation,
      installRoot,
      npmCache,
      useLatestTag: config.useLatestTagOnInstall && !localSimulation
    });
    await assertCleanInstallSmoke(installRoot);
    await assertPublishedUpdateSmoke(tempRoot, npmCache, {
      localSimulation,
      version: effectiveVersion,
      useLatestTagOnInstall: config.useLatestTagOnInstall
    });

    return {
      ok: true,
      version: runCli(installRoot, ['version']).stdout.trim(),
      source: localSimulation ? source : packSource || source,
      localSimulation,
      label: config.label
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
