import { resolveNpmDistTag } from './npm-dist-tag.mjs';

const RC_VERSION_PATTERN = /^\d+\.\d+\.\d+-rc\.\d+$/;

export function isRcVersion(version) {
  return RC_VERSION_PATTERN.test(String(version || '').trim());
}

export function assertRcVersion(version, label = 'version') {
  if (!isRcVersion(version)) {
    throw new Error(`${label} must match 1.0.0-rc.N semver, got: ${version}`);
  }
}

export function expectedDistTagForVersion(version) {
  return resolveNpmDistTag(version);
}

export function parseDistTagsJson(stdout) {
  const start = stdout.indexOf('{');
  return JSON.parse(stdout.slice(start));
}
