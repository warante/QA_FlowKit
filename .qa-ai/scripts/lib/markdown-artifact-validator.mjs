import { parseMarkdownTable, normalizeColumn } from './markdown-table.mjs';
import { normalizeId } from './gherkin-validate.mjs';
import { pathExists, readText, resolveRepoPath } from './utils.mjs';

/**
 * @returns {Promise<{ ok: true } | { ok: false, errors: string[], warnings: string[] }>}
 */
export async function resolveArtifactOrMissing({ absPath, relPath, allowMissing, notFoundMessage }) {
  if (await pathExists(absPath)) {
    return { ok: true };
  }
  if (allowMissing) {
    return { ok: true, missing: true, errors: [], warnings: [] };
  }
  return {
    ok: false,
    errors: [notFoundMessage || `Artifact file not found at: ${relPath}`],
    warnings: []
  };
}

/**
 * Load and parse the traceability matrix with required columns.
 * @returns {Promise<
 *   | { ok: true, content: string, table: object, validTestIds: Set<string>, validRfs: Set<string>, rfToCases: Map<string, Set<string>> }
 *   | { ok: false, errors: string[], warnings: string[] }
 * >}
 */
export async function loadTraceabilityMatrix(cwd, matrixPath, { requiredColumns = ['Test Management Case ID'] } = {}) {
  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  if (!(await pathExists(matrixAbsPath))) {
    return {
      ok: false,
      errors: [`Traceability matrix file not found at: ${matrixPath}`],
      warnings: []
    };
  }

  const content = await readText(matrixAbsPath);
  const table = parseMarkdownTable(content, {
    label: 'Traceability matrix',
    requiredColumns
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((error) => `Traceability matrix error: ${error}`),
      warnings: []
    };
  }

  const validTestIds = new Set();
  const validRfs = new Set();
  const rfToCases = new Map();

  for (const row of table.rows) {
    const rawId = String(row.values[normalizeColumn('Test Management Case ID')] || '').trim();
    const rawRf = String(row.values[normalizeColumn('RF')] || '').trim();

    if (rawId) {
      const normId = normalizeId(rawId);
      validTestIds.add(normId);
      if (rawRf) {
        const normRf = normalizeId(rawRf);
        validRfs.add(normRf);
        if (!rfToCases.has(normRf)) {
          rfToCases.set(normRf, new Set());
        }
        rfToCases.get(normRf).add(normId);
      }
    }
  }

  return { ok: true, content, table, validTestIds, validRfs, rfToCases };
}

export { normalizeColumn, parseMarkdownTable };
