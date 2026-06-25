#!/usr/bin/env node
/**
 * TASK-083 rehearsal: validate prepared stable release-please policy and latest dist-tag smoke.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePackOutput, validatePackFileList } from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';
import { resolveNpmDistTag } from './lib/npm-dist-tag.mjs';
import { isPreparedStablePolicy, STABLE_CONFIG } from './lib/stable-release-config.mjs';
import { verifyStableReleaseConfig } from './verify-stable-release-config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';

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

async function packAndInstall(tempRoot) {
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const installRoot = path.join(tempRoot, 'stable-rehearsal-install');
  await fs.mkdir(packDir, { recursive: true });
  await fs.mkdir(npmCache, { recursive: true });

  const packResult = runNpm(['pack', '--pack-destination', packDir, '--json'], {
    cwd: repoRoot,
    env: { npm_config_cache: npmCache }
  });
  const packInfo = parsePackOutput(packResult.stdout);
  validatePackFileList(packInfo.files);
  const tarball = path.join(packDir, packInfo.filename);

  await fs.mkdir(installRoot, { recursive: true });
  runNpm(['install', '--prefix', installRoot, '--ignore-scripts', '--package-lock=false', '--no-save', tarball], {
    cwd: repoRoot,
    env: { npm_config_cache: npmCache }
  });

  const version = runCli(installRoot, ['version']).stdout.trim();
  assert.match(version, /^\d+\.\d+\.\d+/, 'packed install must expose semver version');
  runCli(installRoot, ['init', '--skip-doctor', '--no-adapters']);
  runCli(installRoot, ['doctor']);
  runCli(installRoot, ['validate-config', '--json']);

  return { version, tarball: packInfo.filename };
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
    const install = await packAndInstall(tempRoot);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
