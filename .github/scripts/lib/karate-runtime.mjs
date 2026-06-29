import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { node, run } from './ci-helpers.mjs';

export const KARATE_VERSION = '2.0.9';

export async function freePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

export async function waitForHttp(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export async function downloadKarateJar(destination, version = KARATE_VERSION) {
  const url = `https://github.com/karatelabs/karate/releases/download/v${version}/karate-${version}.jar`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Karate download failed (${response.status}): ${url}`);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

/**
 * @param {object} options
 * @param {string} options.targetRoot
 * @param {string} options.tempRoot
 * @param {string} options.serverEntry Relative path to server script under targetRoot
 * @param {string} options.healthPath HTTP path to wait for (e.g. /api/profile)
 * @param {string[]} options.karatePaths Karate feature paths relative to targetRoot
 */
export async function executeKarate({
  targetRoot,
  tempRoot,
  serverEntry,
  healthPath,
  karatePaths,
  version = KARATE_VERSION
}) {
  const javaVersion = spawnSync('java', ['-version'], { encoding: 'utf8', shell: false });
  if (javaVersion.status !== 0) {
    throw new Error('Karate runtime verification requires Java 17 or later.');
  }

  const jarPath = path.join(tempRoot, `karate-${version}.jar`);
  await downloadKarateJar(jarPath, version);
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn(node, [serverEntry], {
    cwd: targetRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false
  });

  try {
    await waitForHttp(`${baseUrl}${healthPath}`);
    run('java', [`-DbaseUrl=${baseUrl}`, '-jar', jarPath, ...karatePaths], {
      cwd: targetRoot
    });
  } finally {
    server.kill();
  }
}
