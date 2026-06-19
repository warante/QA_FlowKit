#!/usr/bin/env node
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const exampleRoot = path.join(repoRoot, 'examples', 'maestro-karate-mobile');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmExecPath = process.env.npm_execpath || '';
const node = process.execPath;
const runRuntime = process.argv.includes('--runtime');
const karateVersion = '2.0.9';

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
      [`Command failed: ${command} ${args.join(' ')}`, result.error?.message, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n')
    );
  }
  return result;
}

function runNpm(args, options) {
  if (npmExecPath) return run(node, [npmExecPath, ...args], options);
  return run(npmCommand, args, options);
}

function cliPath(cliRoot) {
  return path.join(cliRoot, 'node_modules', 'qa-flowkit', 'bin', 'qa-flowkit.mjs');
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function waitForHttp(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local API may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function downloadKarateJar(destination) {
  const url = `https://github.com/karatelabs/karate/releases/download/v${karateVersion}/karate-${karateVersion}.jar`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Karate download failed (${response.status}): ${url}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function executeKarate(targetRoot, tempRoot) {
  const javaVersion = spawnSync('java', ['-version'], { encoding: 'utf8', shell: false });
  if (javaVersion.status !== 0) {
    throw new Error('Karate runtime verification requires Java 17 or later.');
  }

  const jarPath = path.join(tempRoot, `karate-${karateVersion}.jar`);
  await downloadKarateJar(jarPath);
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(node, ['app/server.mjs'], {
    cwd: targetRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  try {
    await waitForHttp(`${baseUrl}/api/accounts/demo/balance`);
    run('java', [`-DbaseUrl=${baseUrl}`, '-jar', jarPath, 'tests/karate/features/api'], {
      cwd: targetRoot
    });
  } finally {
    server.kill();
  }
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-mobile-example-'));
  const packDir = path.join(tempRoot, 'pack');
  const npmCache = path.join(tempRoot, 'npm-cache');
  const targetRoot = path.join(tempRoot, 'target');
  const cliRoot = path.join(tempRoot, 'cli');

  try {
    await fs.mkdir(packDir, { recursive: true });
    await fs.mkdir(npmCache, { recursive: true });
    await fs.cp(exampleRoot, targetRoot, { recursive: true });

    const pack = runNpm(['pack', '--pack-destination', packDir, '--json'], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });
    const packInfo = JSON.parse(pack.stdout)[0];
    const tarball = path.join(packDir, packInfo.filename);

    runNpm(['install', '--prefix', cliRoot, '--ignore-scripts', '--package-lock=false', '--no-save', tarball], {
      cwd: repoRoot,
      env: { npm_config_cache: npmCache }
    });

    const cli = cliPath(cliRoot);
    run(
      node,
      [
        cli,
        'init',
        '--preset',
        'maestro-karate-mobile',
        '--set',
        'automation.mobile.appId=com.example.qaflowkit',
        '--no-adapters',
        '--skip-doctor'
      ],
      {
        cwd: targetRoot
      }
    );
    run(node, [cli, 'validate-target'], { cwd: targetRoot });

    if (runRuntime) {
      await executeKarate(targetRoot, tempRoot);
      console.log('Mobile reference passed packed install, strict validation and Karate API execution.');
    } else {
      console.log('Mobile reference passed packed install and strict structural validation.');
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
