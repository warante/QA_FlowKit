export const idPattern = /\b(?:RF|TC|TEST|QA)(?:[-_][A-Z0-9]+| \d[A-Z0-9]*|\d+)\b/gi;

export function normalizeId(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

export function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

export function normalizeRf(value) {
  return String(value || '')
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

const DEFAULT_TRUE_VALUES = new Set(['true', 'yes', 'y', 'required', 'applicable', 'si', 'sí']);
const DEFAULT_FALSE_VALUES = new Set(['false', 'no', 'n', 'not-applicable', 'not applicable', 'n/a', 'na']);

export function booleanValue(value, { trueValues = DEFAULT_TRUE_VALUES, falseValues = DEFAULT_FALSE_VALUES } = {}) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (trueValues.has(normalized)) return true;
  if (falseValues.has(normalized)) return false;
  return null;
}
