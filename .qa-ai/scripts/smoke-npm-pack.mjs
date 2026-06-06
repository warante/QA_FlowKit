#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';

function run(command, args, { cwd, env = {}, expectFailure = false, shell = false } = {}) {
  const childEnv = {
    ...process.env,
    npm_config_update_notifier: 'false',
    npm_config_fund: 'false',
    npm_config_audit: 'false'
  };
  if (env.npm_config_cache) childEnv.npm_config_cache = env.npm_config_cache;

  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell,
    env: childEnv
  });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(
      [
        `Command ${expectFailure ? 'succeeded unexpectedly' : 'failed'} (${result.status}): ${command} ${args.join(' ')}`,
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

function runNpm(args, options = {}) {
  if (npmExecPath) return run(node, [npmExecPath, ...args], options);
  return run(npmCommand, args, {
    ...options,
    shell: process.platform === 'win32'
  });
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
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`Expected ${label} to be absent.`);
}

function parsePackOutput(stdout) {
  const parsed = JSON.parse(stdout);
  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!item?.filename || !Array.isArray(item.files)) {
    throw new Error('Unexpected npm pack --json output.');
  }
  return item;
}

function validatePackFileList(files) {
  const names = files.map((file) => file.path).sort();
  const required = [
    'bin/qa-flowkit.mjs',
    '.qa-ai/scripts/init.mjs',
    '.qa-ai/scripts/doctor.mjs',
    '.qa-ai/contracts/workflow.v1.json',
    '.qa-ai/scripts/qa-run.mjs',
    '.qa-ai/scripts/lib/harness-paths.mjs',
    '.qa-ai/scripts/lib/harness-modification.mjs',
    '.qa-ai/adapters/opencode/commands/qa-init.md',
    'README.md',
    'README.es.md',
    'LICENSE',
    'package.json'
  ];
  const forbiddenPrefixes = [
    '.github/',
    '.claude/',
    '.opencode/',
    '.npm-cache/',
    'qa-ai-output/',
    'features/',
    'tests/'
  ];
  const forbiddenExact = [
    'qa-ai.config.yaml',
    '.qa-ai/state/init-manifest.json',
    '.qa-ai/agents/specialists/active.md'
  ];

  for (const relPath of required) {
    if (!names.includes(relPath)) throw new Error(`Pack file list is missing required path: ${relPath}`);
  }
  for (const relPath of names) {
    if (forbiddenExact.includes(relPath) || forbiddenPrefixes.some((prefix) => relPath.startsWith(prefix))) {
      throw new Error(`Pack file list includes forbidden path: ${relPath}`);
    }
  }
}

function cliPath(targetRoot) {
  return path.join(targetRoot, 'node_modules', 'qa-flowkit', 'bin', 'qa-flowkit.mjs');
}

function runCli(targetRoot, args, options = {}) {
  return run(node, [cliPath(targetRoot), ...args], {
    cwd: targetRoot,
    env: options.env,
    expectFailure: options.expectFailure
  });
}

async function installPackedCli(targetRoot, tarball, npmCache) {
  runNpm(['install', '--prefix', targetRoot, '--ignore-scripts', '--package-lock=false', '--no-save', tarball], {
    cwd: sourceRoot,
    env: { npm_config_cache: npmCache }
  });
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(sourceRoot, '.qa-flowkit-npm-smoke-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  let initTarget;
  let updateTarget;

  try {
    await fs.mkdir(packDir, { recursive: true });
    await fs.mkdir(npmCache, { recursive: true });

    const packResult = runNpm(['pack', '--pack-destination', packDir, '--json'], {
      cwd: sourceRoot,
      env: { npm_config_cache: npmCache }
    });
    const packInfo = parsePackOutput(packResult.stdout);
    validatePackFileList(packInfo.files);
    const tarball = path.join(packDir, packInfo.filename);
    await assertExists(tarball, 'packed tarball');

    initTarget = path.join(tempRoot, 'init-target');
    await fs.mkdir(initTarget, { recursive: true });
    await installPackedCli(initTarget, tarball, npmCache);
    runCli(initTarget, ['init', '--skip-doctor']);
    await assertExists(path.join(initTarget, '.qa-ai', 'scripts', 'init.mjs'), '.qa-ai framework');
    await assertExists(path.join(initTarget, 'qa-ai.config.yaml'), 'generated config');
    await assertExists(path.join(initTarget, 'features'), 'features directory');
    await assertExists(path.join(initTarget, 'qa-ai-output'), 'qa-ai-output directory');
    await assertExists(path.join(initTarget, '.opencode', 'commands', 'qa-init.md'), 'default OpenCode adapter');
    runCli(initTarget, ['init', '--skip-doctor'], { expectFailure: true });
    runCli(initTarget, ['doctor']);
    runCli(initTarget, ['validate-target', '--allow-empty', '--allow-missing', '--no-strict-doctor']);

    const versionResult = runCli(initTarget, ['version']);
    if (!versionResult.stdout.trim()) throw new Error('qa-flowkit version produced no output.');
    const helpResult = runCli(initTarget, ['help', '--json']);
    if (!helpResult.stdout) throw new Error('qa-flowkit help produced no output.');
    runCli(initTarget, ['unknown-command-xyzzy'], { expectFailure: true });
    runCli(initTarget, ['validate-features', '--allow-empty']);
    runCli(initTarget, ['validate-active-specialists', '--allow-missing']);
    runCli(initTarget, ['run', 'start']);
    const statusBefore = runCli(initTarget, ['run', 'status', '--json']);
    JSON.parse(statusBefore.stdout);

    runCli(initTarget, ['run', 'next']);
    runCli(initTarget, ['run', 'check'], { expectFailure: true });
    runCli(initTarget, ['run', 'check'], { expectFailure: true });
    const blockedCheck = runCli(initTarget, ['run', 'check', '--json'], { expectFailure: true });
    const blockedPayload = JSON.parse(blockedCheck.stdout);
    if (!blockedPayload.retryable) throw new Error('Expected validation block to be retryable.');
    runCli(initTarget, ['run', 'retry']);
    await fs.writeFile(path.join(initTarget, 'qa-ai-output', 'requirement-analysis.md'), '# intake\n', 'utf8');
    runCli(initTarget, ['run', 'check']);

    updateTarget = path.join(tempRoot, 'update-target');
    await fs.mkdir(updateTarget, { recursive: true });
    await installPackedCli(updateTarget, tarball, npmCache);
    runCli(updateTarget, ['init', '--skip-doctor']);
    await fs.mkdir(path.join(updateTarget, '.qa-ai', 'state'), { recursive: true });
    await fs.mkdir(path.join(updateTarget, '.qa-ai', 'config-profiles'), { recursive: true });
    await fs.writeFile(path.join(updateTarget, '.qa-ai', 'state', 'keep.json'), '{}\n', 'utf8');
    await fs.writeFile(path.join(updateTarget, '.qa-ai', 'config-profiles', 'team.yaml'), 'version: 1\n', 'utf8');
    await fs.writeFile(path.join(updateTarget, '.qa-ai', 'obsolete.txt'), 'old\n', 'utf8');
    await fs.writeFile(path.join(updateTarget, 'qa-ai-output', 'user.md'), 'USER\n', 'utf8');
    runCli(updateTarget, ['run', 'start', '--rf', 'RF-UPDATE']);
    runCli(updateTarget, ['run', 'next']);
    const activePointer = path.join(updateTarget, '.qa-ai', 'state', 'runs', 'active.json');
    const activeBefore = await fs.readFile(activePointer, 'utf8');
    const runEntries = await fs.readdir(path.join(updateTarget, '.qa-ai', 'state', 'runs'), {
      withFileTypes: true
    });
    const runDirCount = runEntries.filter((entry) => entry.isDirectory()).length;
    if (runDirCount < 1) throw new Error('Expected at least one run directory before update.');

    runCli(updateTarget, ['update', '--skip-doctor']);
    const activeAfter = await fs.readFile(activePointer, 'utf8');
    if (activeBefore !== activeAfter) throw new Error('Active run pointer changed after update.');
    await assertExists(path.join(updateTarget, '.qa-ai', 'state', 'keep.json'), 'preserved state');
    await assertExists(path.join(updateTarget, '.qa-ai', 'config-profiles', 'team.yaml'), 'preserved config profile');
    await assertMissing(path.join(updateTarget, '.qa-ai', 'obsolete.txt'), 'obsolete framework file');
    await assertExists(path.join(updateTarget, 'qa-ai-output', 'user.md'), 'target output artifact');

    console.log('npm pack smoke tests passed.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
