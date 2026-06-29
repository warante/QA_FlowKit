/** Shared advisory/gate mode vocabulary (off | advisory | strict). */
export const ADVISORY_MODES = ['off', 'advisory', 'strict'];

/**
 * Normalize quality/coverage mode values.
 * Accepts legacy `gate` as an alias for `strict`.
 */
export function normalizeAdvisoryMode(value, fallback = 'off') {
  const normalized = String(value ?? fallback)
    .trim()
    .toLowerCase();
  if (normalized === 'gate') return 'strict';
  if (ADVISORY_MODES.includes(normalized)) return normalized;
  return fallback;
}

export function isBlockingAdvisoryMode(mode) {
  return normalizeAdvisoryMode(mode) === 'strict';
}
