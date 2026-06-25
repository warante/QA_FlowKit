#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveNpmDistTag } from './lib/npm-dist-tag.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ACTIVE_CONFIG = '.release-please-config.json';
const RC_CONFIG = '.release-please-config.rc.json';
const STABLE_CONFIG = '.release-please-config.stable.json';

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function packageKeys(config) {
  return Object.keys(config.packages || {})
    .sort()
    .join('\0');
}

async function readJsonFromRoot(root, relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
}

export async function verifyReleasePolicy({ root = repoRoot } = {}) {
  const errors = [];
  const active = await readJsonFromRoot(root, ACTIVE_CONFIG);
  const rc = await readJsonFromRoot(root, RC_CONFIG);
  const stable = await readJsonFromRoot(root, STABLE_CONFIG);

  assert(active.prerelease === true, 'active config must remain prerelease during beta', errors);
  assert(
    active['prerelease-type'] === 'beta',
    'active config must use prerelease-type beta until RC transition PR',
    errors
  );
  assert(rc.prerelease === true, 'RC config must keep prerelease true', errors);
  assert(rc['prerelease-type'] === 'rc', 'RC config must use prerelease-type rc', errors);
  assert(stable.prerelease === false, 'stable config must disable prerelease', errors);
  assert(stable['prerelease-type'] === undefined, 'stable config must not set prerelease-type', errors);

  assert(packageKeys(active) === packageKeys(rc), 'RC config package map must match active config', errors);
  assert(packageKeys(active) === packageKeys(stable), 'stable config package map must match active config', errors);

  const samples = [
    ['0.5.8-beta.0', 'beta'],
    ['1.0.0-rc.1', 'rc'],
    ['1.0.0-rc.2', 'rc'],
    ['1.0.0', 'latest']
  ];
  for (const [version, expectedTag] of samples) {
    const tag = resolveNpmDistTag(version);
    assert(tag === expectedTag, `dist-tag for ${version} expected ${expectedTag}, got ${tag}`, errors);
  }

  assert(resolveNpmDistTag('1.0.0', { override: 'beta' }) === 'beta', 'dist-tag override must work', errors);

  return { ok: errors.length === 0, errors };
}

async function main() {
  const result = await verifyReleasePolicy();
  if (!result.ok) {
    console.error('Release policy verification failed:\n');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('Release policy verification passed (beta active, rc/stable configs prepared).');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
