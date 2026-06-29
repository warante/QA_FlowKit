#!/usr/bin/env node
import fs from 'node:fs/promises';
import { isMain, repoRoot } from './lib/ci-helpers.mjs';
import path from 'node:path';
import { resolveNpmDistTag } from './lib/npm-dist-tag.mjs';

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

async function collectVersionedManifestPaths(root) {
  const docsDir = path.join(root, 'docs', 'qa-ai');
  const entries = await fs.readdir(docsDir);
  const manifests = [];

  for (const entry of entries) {
    if (!entry.endsWith('.v1.json')) continue;
    const relativePath = path.join('docs', 'qa-ai', entry).replace(/\\/g, '/');
    const manifest = await readJsonFromRoot(root, relativePath);
    if (Object.hasOwn(manifest, 'qaFlowKitVersion')) {
      manifests.push(relativePath);
    }
  }

  return manifests.sort();
}

function extraFileKeys(config) {
  return new Set((config.packages?.['.']?.['extra-files'] || []).map((file) => `${file.path}#${file.jsonpath}`));
}

export async function verifyReleasePolicy({ root = repoRoot } = {}) {
  const errors = [];
  const active = await readJsonFromRoot(root, ACTIVE_CONFIG);
  const rc = await readJsonFromRoot(root, RC_CONFIG);
  const stable = await readJsonFromRoot(root, STABLE_CONFIG);
  const configs = new Map([
    [ACTIVE_CONFIG, active],
    [RC_CONFIG, rc],
    [STABLE_CONFIG, stable]
  ]);
  const versionedManifests = await collectVersionedManifestPaths(root);

  assert(active.prerelease === true, 'active config must remain prerelease during RC line', errors);
  assert(active['prerelease-type'] === 'rc', 'active config must use prerelease-type rc', errors);
  assert(active.versioning === 'prerelease', 'active config must use prerelease versioning strategy', errors);
  assert(rc.prerelease === true, 'RC config must keep prerelease true', errors);
  assert(rc['prerelease-type'] === 'rc', 'RC config must use prerelease-type rc', errors);
  assert(rc.versioning === 'prerelease', 'RC config must use prerelease versioning strategy', errors);
  assert(
    JSON.stringify(active) === JSON.stringify(rc),
    'active config must match prepared RC config after RC transition',
    errors
  );
  assert(stable.prerelease === false, 'stable config must disable prerelease', errors);
  assert(stable['prerelease-type'] === undefined, 'stable config must not set prerelease-type', errors);
  assert(stable.versioning === 'prerelease', 'stable config must use prerelease versioning strategy', errors);

  assert(packageKeys(active) === packageKeys(rc), 'RC config package map must match active config', errors);
  assert(packageKeys(active) === packageKeys(stable), 'stable config package map must match active config', errors);

  const activeExtraFileKeys = extraFileKeys(active);
  for (const [configPath, config] of configs) {
    const configExtraFileKeys = extraFileKeys(config);
    for (const manifestPath of versionedManifests) {
      assert(
        configExtraFileKeys.has(`${manifestPath}#$.qaFlowKitVersion`),
        `${configPath} must update ${manifestPath} qaFlowKitVersion`,
        errors
      );
    }
    for (const key of activeExtraFileKeys) {
      assert(configExtraFileKeys.has(key), `${configPath} extra-files must include ${key}`, errors);
    }
  }

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
  console.log('Release policy verification passed (rc active, stable config prepared).');
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
