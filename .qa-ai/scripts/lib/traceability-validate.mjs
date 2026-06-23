import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { validateNfrTraceability } from './nfr-coverage.mjs';

const idPattern = /\b(?:RF|TC|TEST|QA)(?:[-_][A-Z0-9]+| \d[A-Z0-9]*|\d+)\b/gi;
const caseIdPattern = /\b(?:TC|TEST|QA)(?:[-_][A-Z0-9]+| \d[A-Z0-9]*|\d+)\b/gi;
const requiredColumns = [
  'Requirement Source',
  'RF',
  'Feature File',
  'Test Management Case ID',
  'Type',
  'Priority',
  'Automation Status'
];

function normalizeId(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function idsFromText(value) {
  return [...String(value || '').matchAll(idPattern)].map((match) => normalizeId(match[0]));
}

function caseIdsFromText(value) {
  return [...String(value || '').matchAll(caseIdPattern)].map((match) => normalizeId(match[0]));
}

function functionalMatrixContent(content) {
  const lines = String(content || '')
    .replace(/\r/g, '')
    .split('\n');
  const nfrIndex = lines.findIndex((line) => {
    const match = line.trim().match(/^##\s+(.+)$/);
    if (!match) return false;
    const heading = match[1].trim().toLowerCase();
    return heading === 'non-functional traceability' || heading === 'trazabilidad no funcional';
  });
  if (nfrIndex === -1) return content;
  return lines.slice(0, nfrIndex).join('\n');
}

export function parseFunctionalTraceabilityMatrix(content) {
  const table = parseMarkdownTable(functionalMatrixContent(content), {
    label: 'Traceability matrix',
    requiredColumns
  });
  const errors = [...table.errors];
  const rows = [];
  for (const row of table.rows) {
    const ids = [...new Set(idsFromText(row.cells.join(' ')))].sort();
    const caseIds = [...new Set(caseIdsFromText(row.cells.join(' ')))].sort();
    if (ids.length === 0) {
      errors.push(`Line ${row.line}: row must include at least one RF/test identifier.`);
    }
    rows.push({ ...row, ids, caseIds });
  }

  return { errors, rows, header: table.header };
}

export function duplicateFunctionalTraceabilityErrors(rows) {
  const errors = [];
  const byCaseId = new Map();
  const byFeatureFile = new Map();

  for (const row of rows) {
    for (const id of row.caseIds) {
      const current = byCaseId.get(id) || [];
      current.push(row.line);
      byCaseId.set(id, current);
    }

    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();
    if (featureFile) {
      const normalizedFeatureFile = featureFile.replaceAll('\\', '/').toLowerCase();
      const current = byFeatureFile.get(normalizedFeatureFile) || [];
      current.push(row.line);
      byFeatureFile.set(normalizedFeatureFile, current);
    }
  }

  for (const [id, lines] of byCaseId.entries()) {
    if (lines.length > 1) errors.push(`Identifier ${id} appears in multiple traceability rows: ${lines.join(', ')}.`);
  }
  for (const [featureFile, lines] of byFeatureFile.entries()) {
    if (lines.length > 1) {
      errors.push(`Feature file ${featureFile} appears in multiple traceability rows: ${lines.join(', ')}.`);
    }
  }

  return errors;
}

export function validateFunctionalTraceability({ matrixContent = '', features = [] }) {
  const matrix = parseFunctionalTraceabilityMatrix(matrixContent);
  const errors = [...matrix.errors, ...duplicateFunctionalTraceabilityErrors(matrix.rows)];
  const matrixContentNormalized = normalizeId(functionalMatrixContent(matrixContent));

  for (const feature of features) {
    if (feature.ids.length === 0) {
      errors.push(`${feature.file} has no RF/test identifiers to trace.`);
      continue;
    }
    for (const id of feature.ids) {
      if (!matrixContentNormalized.includes(id)) {
        errors.push(
          `${feature.file} identifier ${id} is missing from the functional traceability table. ` +
            'Add a matrix row with RF, Feature File, and Test Management Case ID columns.'
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, rows: matrix.rows };
}

export function validateTraceabilityArtifacts({ matrixContent = '', normalizedContent = '', features = [] }) {
  const functional = validateFunctionalTraceability({ matrixContent, features });
  const nfr = validateNfrTraceability({ normalizedContent, matrixContent });
  const errors = [...functional.errors, ...nfr.errors];
  const warnings = [...nfr.warnings];

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    functional,
    nfr,
    nfrMetrics: nfr.metrics
  };
}

export function featureTraceabilityIds(file, content) {
  const ids = new Set([...idsFromText(path.basename(file, '.feature')), ...idsFromText(content)]);
  return {
    file,
    ids: [...ids].sort()
  };
}
