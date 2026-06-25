/**
 * Resolve npm dist-tag from a semver string. Mirrors publish workflow bash logic.
 */
export function resolveNpmDistTag(version, { override = '' } = {}) {
  const trimmedOverride = String(override || '').trim();
  if (trimmedOverride) return trimmedOverride;

  const text = String(version || '').trim();
  if (!text.includes('-')) return 'latest';

  const prerelease = text.slice(text.indexOf('-') + 1);
  const prereleaseId = prerelease.split('.')[0];
  return prereleaseId || 'latest';
}

/**
 * Simulates npm registry propagation retries after publish (release-please post-publish step).
 */
export function simulateRegistryVisibilityCheck(attempts, expectedVersion) {
  for (let index = 0; index < attempts.length; index += 1) {
    const published = attempts[index];
    if (published === expectedVersion) {
      return { ok: true, published, attempts: index + 1 };
    }
  }
  const last = attempts[attempts.length - 1] ?? '';
  return { ok: false, published: last, attempts: attempts.length };
}
