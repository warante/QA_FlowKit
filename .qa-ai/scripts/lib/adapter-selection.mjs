/**
 * Shared helpers for bootstrap/sync adapter name selection.
 */
export function resolveAdapterSelection(requestedNames, validKeys, { allToken = 'all', noneToken = 'none' } = {}) {
  const requested = requestedNames.map((name) => String(name).toLowerCase());
  if (requested.length === 0 || requested.includes(allToken)) return [...validKeys];
  if (requested.includes(noneToken)) return [];
  return [...new Set(requested)];
}

export function findUnknownNames(selected, validKeys) {
  const valid = new Set(validKeys);
  return selected.filter((name) => !valid.has(name));
}

export function formatUnknownNamesError(selected, validKeys, label) {
  const unknown = findUnknownNames(selected, validKeys);
  if (unknown.length === 0) return null;
  return `Unknown ${label}(s): ${unknown.join(', ')}\nSupported ${label}s: ${validKeys.join(', ')}`;
}
