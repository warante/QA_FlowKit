#!/usr/bin/env node
/**
 * TASK-085: validate a published (or locally simulated) stable package from npm @latest.
 *
 * Usage:
 *   node .github/scripts/run-stable-post-publish-validation.mjs --version 1.0.0
 *   node .github/scripts/run-stable-post-publish-validation.mjs --local-simulation
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePackOutput, validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';
import { resolveNpmDistTag, simulateRegistryVisibilityCheck } from './lib/npm-dist-tag.mjs';
import { assertStableVersion, parseDistTagsJson } from './lib/stable-version.mjs';
import { node, npmCommand, npmExecPath, parseJsonStdout, repoRoot, runCli, runNpm } from './lib/ci-helpers.mjs';
import { overlayOldestSupportedFixture } from './lib/migration-fixture.mjs';

function parseArgs(argv) {
  const args = { localSimulation: false, version: process.env.QA_FLOWKIT_STABLE_VERSION || '' };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--local-simulation') args.localSimulation = true;
    if (argv[index] === '--version' && argv[index + 1]) {
      args.version = argv[++index];
    }
  }
  return args;
}

async function verifyRegistryMetadata(version, npmCache) {
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

  const latestView = runNpm(['view', 'qa-flowkit@latest', 'version'], {
    env: { npm_config_cache: npmCache }
  });
  assert.equal(String(latestView.stdout || '').trim(), version, `qa-flowkit@latest must resolve to ${version}`);

  const tagsResult = runNpm(['view', 'qa-flowkit', 'dist-tags', '--json'], {
    env: { npm_config_cache: npmCache }
  });
  const tags = parseDistTagsJson(tagsResult.stdout);
  assert.equal(tags.latest, version, `dist-tag latest must point to ${version}, got ${tags.latest}`);
  assert.equal(resolveNpmDistTag(version), 'latest');
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

async function assertPublishedUpdateSmoke(tempRoot, npmCache, { localSimulation, version }) {
  const migrationRoot = path.join(tempRoot, 'migration-target');
  await installPackage({
    version,
    localSimulation,
    installRoot: migrationRoot,
    npmCache,
    useLatestTag: !localSimulation
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

export async function runStablePostPublishValidation(options = {}) {
  const args = { ...parseArgs(process.argv), ...options };
  const localSimulation = Boolean(args.localSimulation);
  let effectiveVersion = String(args.version || '').trim();

  if (localSimulation) {
    if (!effectiveVersion) {
      effectiveVersion = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8')).version;
    }
  } else {
    assert.ok(effectiveVersion, 'Pass --version 1.0.0 or set QA_FLOWKIT_STABLE_VERSION');
    assertStableVersion(effectiveVersion);
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-stable-post-publish-'));
  const npmCache = path.join(tempRoot, 'npm-cache');
  const installRoot = path.join(tempRoot, 'clean-install');

  try {
    let packSource = '';
    if (!localSimulation) {
      await verifyRegistryMetadata(effectiveVersion, npmCache);
      packSource = await assertRegistryPackAllowlist(effectiveVersion, npmCache, tempRoot);
    } else {
      assert.equal(resolveNpmDistTag('1.0.0'), 'latest');
    }

    const source = await installPackage({
      version: effectiveVersion,
      localSimulation,
      installRoot,
      npmCache,
      useLatestTag: !localSimulation
    });
    await assertCleanInstallSmoke(installRoot);
    await assertPublishedUpdateSmoke(tempRoot, npmCache, {
      localSimulation,
      version: effectiveVersion
    });

    return {
      ok: true,
      version: runCli(installRoot, ['version']).stdout.trim(),
      source: localSimulation ? source : packSource || source,
      localSimulation
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  const result = await runStablePostPublishValidation();
  const mode = result.localSimulation ? 'local simulation' : 'registry';
  console.log(`Stable post-publish validation passed (${mode}, ${result.source}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
