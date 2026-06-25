import { resolveNpmDistTag } from './npm-dist-tag.mjs';

const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export function isStableVersion(version) {
  const value = String(version || '').trim();
  return STABLE_VERSION_PATTERN.test(value) && !value.includes('-');
}

export function assertStableVersion(version, label = 'version') {
  if (!isStableVersion(version)) {
    throw new Error(`${label} must be stable semver without prerelease suffix, got: ${version}`);
  }
}

export function expectedDistTagForStableVersion(version) {
  return resolveNpmDistTag(version);
}

export { parseDistTagsJson } from './rc-version.mjs';
