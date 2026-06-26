export const REQUIRED_MIN_RELEASE_AGE_DAYS = 2;
export const MIN_NPM_VERSION = '11.10.0';

export function parseNpmrc(content) {
  const values = new Map();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values.set(key, value);
  }
  return values;
}

export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(String(version).trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

export function semverGte(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return false;
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

export function verifyNpmReleaseAgePolicy({
  npmrcContent,
  npmVersion,
  checkNpmVersion = false,
  requiredDays = REQUIRED_MIN_RELEASE_AGE_DAYS
} = {}) {
  const errors = [];

  if (typeof npmrcContent !== 'string' || npmrcContent.trim() === '') {
    errors.push('`.npmrc` is missing or empty.');
    return { ok: false, errors };
  }

  const values = parseNpmrc(npmrcContent);
  if (!values.has('min-release-age')) {
    errors.push('`.npmrc` must set `min-release-age`.');
  } else {
    const configuredDays = Number(values.get('min-release-age'));
    if (!Number.isInteger(configuredDays) || configuredDays < requiredDays) {
      errors.push(
        `\`.npmrc\` must set \`min-release-age=${requiredDays}\` or higher; found "${values.get('min-release-age')}".`
      );
    }
  }

  if (checkNpmVersion) {
    if (!npmVersion) {
      errors.push('npm version is required when --check-npm-version is set.');
    } else if (!semverGte(npmVersion, MIN_NPM_VERSION)) {
      errors.push(
        `npm CLI must be >= ${MIN_NPM_VERSION} to enforce min-release-age; found ${npmVersion}. Upgrade with: npm install -g npm@^11.10.0`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
