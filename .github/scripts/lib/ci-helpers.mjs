import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parsePackOutput, validatePackFileList } from '../../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
export const node = process.execPath;
export const npmExecPath = process.env.npm_execpath || '';
export const sourceCliPath = path.join(repoRoot, 'bin', 'qa-flowkit.mjs');

const bundledNpmCliPath = path.join(path.dirname(node), 'node_modules', 'npm', 'bin', 'npm-cli.js');

export function resolveNpmScriptPath() {
  if (npmExecPath) return npmExecPath;
  if (process.platform === 'win32' && fsSync.existsSync(bundledNpmCliPath)) return bundledNpmCliPath;
  return '';
}

/** @deprecated Use resolveNpmScriptPath() */
export function bundledNpmCli() {
  return resolveNpmScriptPath() || npmCommand;
}

export function isMain(importMetaUrl) {
  return process.argv[1] === fileURLToPath(importMetaUrl);
}

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

export async function assertExists(filePath, label = filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Expected ${label} to exist.`);
  }
}

export async function assertMissing(filePath, label = filePath) {
  try {
    await fs.access(filePath);
    throw new Error(`Expected ${label} to be absent.`);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
}

export async function pathExists(root, relativePath) {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

export function run(command, args, { cwd, env = {}, expectFailure = false, shell = false, stdio = 'pipe' } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell,
    stdio,
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
        result.error?.message,
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

export function runNpm(args, options = {}) {
  const npmScript = resolveNpmScriptPath();
  if (npmScript) return run(node, [npmScript, ...args], options);
  return run(npmCommand, args, { ...options, shell: process.platform === 'win32' });
}

export function runNpmScript(script, extraArgs = [], options = {}) {
  const args = extraArgs.length > 0 ? ['run', script, '--', ...extraArgs] : ['run', script];
  return runNpm(args, { cwd: repoRoot, stdio: 'inherit', ...options });
}

export function runNodeScript(scriptPath, args = [], options = {}) {
  return run(node, [scriptPath, ...args], { cwd: repoRoot, stdio: 'inherit', ...options });
}

export function cliPath(targetRoot) {
  return path.join(targetRoot, 'node_modules', 'qa-flowkit', 'bin', 'qa-flowkit.mjs');
}

export function runCli(targetRoot, args, options = {}) {
  return run(node, [cliPath(targetRoot), ...args], { cwd: targetRoot, ...options });
}

export function runSourceCli(cwd, args, options = {}) {
  return run(node, [sourceCliPath, ...args], { cwd, ...options });
}

export function parseJsonStdout(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`${label} did not return JSON:\n${result.stdout}\n${result.stderr}`);
  }
}

export const jsonOutput = parseJsonStdout;

/** Git Bash on Windows runners emits /d/a/... paths that Node fs APIs cannot open. */
export function normalizeEnvPath(filePath) {
  if (!filePath || process.platform !== 'win32') return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  const msys = normalized.match(/^\/([a-zA-Z])\/(.*)$/);
  if (msys) {
    return `${msys[1].toUpperCase()}:\\${msys[2].replace(/\//g, '\\')}`;
  }
  return filePath;
}

/**
 * Resolve a packed tarball path: reuse CI artifact/env when set, otherwise run npm pack.
 * @returns {Promise<{ tarball: string, packDir: string, fromArtifact: boolean, packInfo?: object }>}
 */
export async function resolvePackTarball({ cwd = repoRoot, packDir, npmCache = process.env.npm_config_cache } = {}) {
  const artifactPath = normalizeEnvPath(process.env.QA_FLOWKIT_PACK_TARBALL);
  if (artifactPath) {
    await assertExists(artifactPath, 'QA_FLOWKIT_PACK_TARBALL');
    return { tarball: artifactPath, packDir: path.dirname(artifactPath), fromArtifact: true };
  }

  await fs.mkdir(packDir, { recursive: true });
  const packResult = runNpm(['pack', '--pack-destination', packDir, '--json'], {
    cwd,
    env: npmCache ? { npm_config_cache: npmCache } : {}
  });
  const packInfo = parsePackOutput(packResult.stdout);
  const tarball = path.join(packDir, packInfo.filename);
  await assertExists(tarball, 'packed tarball');
  return { tarball, packDir, fromArtifact: false, packInfo };
}

export function installPackTarball(targetRoot, tarball, { npmCache } = {}) {
  runNpm(['install', '--prefix', targetRoot, '--ignore-scripts', '--package-lock=false', '--no-save', tarball], {
    cwd: repoRoot,
    env: npmCache ? { npm_config_cache: npmCache } : {}
  });
}

/**
 * Pack (or reuse artifact), optionally validate allowlist, install to prefix.
 * @returns {Promise<{ tarball: string, filename: string, packInfo?: object, fromArtifact: boolean }>}
 */
export async function packAndInstall({
  packDir,
  npmCache,
  installRoot,
  validateAllowlist = false,
  cwd = repoRoot
} = {}) {
  const { tarball, fromArtifact, packInfo } = await resolvePackTarball({ cwd, packDir, npmCache });
  if (!fromArtifact && validateAllowlist && packInfo) {
    validatePackFileList(packInfo.files);
  }
  await fs.mkdir(installRoot, { recursive: true });
  installPackTarball(installRoot, tarball, { npmCache });
  return {
    tarball,
    filename: packInfo?.filename || path.basename(tarball),
    packInfo,
    fromArtifact
  };
}
