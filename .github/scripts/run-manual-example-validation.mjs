#!/usr/bin/env node
/**
 * Installs the locally packed CLI into the public manual-only example and validates it strictly.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exampleRoot = path.join(repoRoot, 'examples', 'manual-only');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const npmExecPath = process.env.npm_execpath || '';

function run(command, args, { cwd, env = {} } = {}) {
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
  if (result.status !== 0) {
    throw new Error(
      [`Command failed: ${command} ${args.join(' ')}`, result.stdout, result.stderr].filter(Boolean).join('\n')
    );
  }
  return result;
}

function runNpm(args, options) {
  if (npmExecPath) return run(node, [npmExecPath, ...args], options);
  return run(npmCommand, args, options);
}

async function digestTree(root) {
  const entries = [];
  const ignoredTopLevel = new Set(['.qa-ai', 'node_modules']);

  async function visit(directory, depth = 0) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (depth === 0 && ignoredTopLevel.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath, depth + 1);
      } else {
        const relativePath = path.relative(root, absolutePath).replaceAll(path.sep, '/');
        const content = await fs.readFile(absolutePath);
        entries.push(`${relativePath}:${createHash('sha256').update(content).digest('hex')}`);
      }
    }
  }

  await visit(root);
  return entries.sort().join('\n');
}

function cliPath(targetRoot) {
  return path.join(targetRoot, 'node_modules', 'qa-flowkit', 'bin', 'qa-flowkit.mjs');
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-manual-example-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');

  try {
    await fs.mkdir(packDir, { recursive: true });
    await fs.mkdir(npmCache, { recursive: true });
    await fs.cp(exampleRoot, targetRoot, { recursive: true });
    const originalDigest = await digestTree(targetRoot);

    const pack = runNpm(['pack', '--pack-destination', packDir, '--json'], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });
    const packInfo = JSON.parse(pack.stdout)[0];
    const tarball = path.join(packDir, packInfo.filename);

    runNpm(['install', '--prefix', targetRoot, '--ignore-scripts', '--package-lock=false', '--no-save', tarball], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });

    const cli = cliPath(targetRoot);
    run(node, [cli, 'init', '--preset', 'manual-only', '--no-adapters', '--skip-doctor'], { cwd: targetRoot });

    const afterInitDigest = await digestTree(targetRoot);
    if (afterInitDigest !== originalDigest) {
      throw new Error('Packed init modified canonical example artifacts.');
    }

    run(node, [cli, 'doctor', '--strict'], { cwd: targetRoot });
    run(node, [cli, 'validate-target'], { cwd: targetRoot });

    console.log('Manual-only public example passed packed install and strict validation.');
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
