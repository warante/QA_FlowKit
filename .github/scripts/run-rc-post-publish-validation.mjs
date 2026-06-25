#!/usr/bin/env node
/**
 * TASK-080: validate a published (or locally simulated) 1.0.0-rc package from npm.
 *
 * Usage:
 *   node .github/scripts/run-rc-post-publish-validation.mjs --version 1.0.0-rc.1
 *   node .github/scripts/run-rc-post-publish-validation.mjs --local-simulation
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePackOutput, validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';
import { resolveNpmDistTag, simulateRegistryVisibilityCheck } from './lib/npm-dist-tag.mjs';
import { assertRcVersion, parseDistTagsJson } from './lib/rc-version.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'migration', 'oldest-supported-beta');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';
const MARKER = 'QA_FLOWKIT_MIGRATION_FIXTURE_MARKER';

function parseArgs(argv) {
  const args = { localSimulation: false, version: process.env.QA_FLOWKIT_RC_VERSION || '' };
  for (let index = 2; index < argv.length; index += 1) {
    if (argv[index] === '--local-simulation') args.localSimulation = true;
    if (argv[index] === '--version' && argv[index + 1]) {
      args.version = argv[++index];
    }
  }
  return args;
}

function run(command, args, { cwd, env = {}, expectFailure = false, shell = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell,
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

function cliPath(targetRoot) {
  return path.join(targetRoot, 'node_modules', 'qa-flowkit', 'bin', 'qa-flowkit.mjs');
}

function runCli(targetRoot, args, options = {}) {
  return run(node, [cliPath(targetRoot), ...args], { cwd: targetRoot, ...options });
}

function parseJsonStdout(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} did not return JSON:\n${result.stdout}\n${result.stderr}`);
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

async function overlayOldestSupportedFixture(targetRoot) {
  const manifest = JSON.parse(await fs.readFile(path.join(fixtureRoot, 'manifest.v1.json'), 'utf8'));
  for (const relativePath of manifest.paths) {
    await copyFixtureTree(relativePath, targetRoot);
  }
  const agentsPath = path.join(targetRoot, 'AGENTS.md');
  try {
    const agents = await fs.readFile(agentsPath, 'utf8');
    if (!agents.includes(MARKER)) {
      await fs.writeFile(agentsPath, `${agents.trimEnd()}\n\n<!-- ${MARKER} -->\n`, 'utf8');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
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

  const tagsResult = runNpm(['view', 'qa-flowkit', 'dist-tags', '--json'], {
    env: { npm_config_cache: npmCache }
  });
  const tags = parseDistTagsJson(tagsResult.stdout);
  assert.equal(tags.rc, version, `dist-tag rc must point to ${version}, got ${tags.rc}`);
  assert.equal(resolveNpmDistTag(version), 'rc');
}

async function installPackage({ version, localSimulation, installRoot, npmCache }) {
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

  runNpm(
    [
      'install',
      '--prefix',
      installRoot,
      '--ignore-scripts',
      '--package-lock=false',
      '--no-save',
      `qa-flowkit@${version}`
    ],
    {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    }
  );
  return `qa-flowkit@${version}`;
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
    npmCache
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

export async function runRcPostPublishValidation(options = {}) {
  const args = { ...parseArgs(process.argv), ...options };
  const localSimulation = Boolean(args.localSimulation);
  let effectiveVersion = String(args.version || '').trim();

  if (localSimulation) {
    if (!effectiveVersion) {
      effectiveVersion = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8')).version;
    }
  } else {
    assert.ok(effectiveVersion, 'Pass --version 1.0.0-rc.N or set QA_FLOWKIT_RC_VERSION');
    assertRcVersion(effectiveVersion);
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-rc-post-publish-'));
  const npmCache = path.join(tempRoot, 'npm-cache');
  const installRoot = path.join(tempRoot, 'clean-install');

  try {
    if (!localSimulation) {
      await verifyRegistryMetadata(effectiveVersion, npmCache);
    } else {
      assert.equal(resolveNpmDistTag('1.0.0-rc.1'), 'rc');
    }

    const source = await installPackage({
      version: effectiveVersion,
      localSimulation,
      installRoot,
      npmCache
    });
    await assertCleanInstallSmoke(installRoot);
    await assertPublishedUpdateSmoke(tempRoot, npmCache, {
      localSimulation,
      version: effectiveVersion
    });

    return {
      ok: true,
      version: runCli(installRoot, ['version']).stdout.trim(),
      source,
      localSimulation
    };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  const result = await runRcPostPublishValidation();
  const mode = result.localSimulation ? 'local simulation' : 'registry';
  console.log(`RC post-publish validation passed (${mode}, ${result.source}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
