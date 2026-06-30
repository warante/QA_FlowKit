/**
 * Detect duplicate identifiers across table rows or validation results.
 * @param {Array<{ line?: number, file?: string, ids?: string[], caseIds?: string[] }>} rows
 * @param {{ key?: 'ids' | 'caseIds', formatMessage?: (id: string, lines: number[]) => string }} [options]
 */
export function duplicateRowIds(rows, options = {}) {
  const key = options.key || 'ids';
  const formatMessage =
    options.formatMessage || ((id, lines) => `Identifier ${id} appears in multiple rows: ${lines.join(', ')}.`);
  const byId = new Map();

  for (const row of rows) {
    const values = row[key] || [];
    const line = row.line ?? row.file;
    for (const id of values) {
      const current = byId.get(id) || [];
      current.push(line);
      byId.set(id, current);
    }
  }

  const errors = [];
  for (const [id, lines] of byId.entries()) {
    if (lines.length > 1) errors.push(formatMessage(id, lines));
  }
  return errors;
}

/**
 * Detect duplicate values grouped by a custom key extractor (e.g. feature file column).
 */
export function duplicateGroupedValues(rows, { extractKey, formatMessage }) {
  const byKey = new Map();
  for (const row of rows) {
    const key = extractKey(row);
    if (!key) continue;
    const current = byKey.get(key) || [];
    current.push(row.line);
    byKey.set(key, current);
  }

  const errors = [];
  for (const [key, lines] of byKey.entries()) {
    if (lines.length > 1) errors.push(formatMessage(key, lines));
  }
  return errors;
}
