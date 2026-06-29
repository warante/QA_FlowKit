import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { validateNfrTraceability } from './nfr-coverage.mjs';
import { parseProposedTestRows } from './semantic-coverage.mjs';
import { caseIdsFromText, idsFromText, normalizeId } from './gherkin-validate.mjs';

export { caseIdsFromText, idsFromText, normalizeId };

const requiredColumns = [
  'Requirement Source',
  'RF',
  'Feature File',
  'Test Management Case ID',
  'Type',
  'Priority',
  'Automation Status'
];

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

function normalizeAutomationStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function isProposalOnlyRow(row) {
  const status = normalizeAutomationStatus(row.values[normalizeColumn('Automation Status')]);
  return status === 'proposal-only' || status === 'proposed';
}

export function validateMatrixFeaturePaths({ matrixContent = '', features = [], featureRoot = 'features' } = {}) {
  const matrix = parseFunctionalTraceabilityMatrix(matrixContent);
  const errors = [];
  const featurePaths = new Set(
    features.map((feature) =>
      String(feature.file || '')
        .replaceAll('\\', '/')
        .toLowerCase()
    )
  );

  for (const row of matrix.rows) {
    if (isProposalOnlyRow(row)) continue;
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '')
      .trim()
      .replaceAll('\\', '/');
    if (!featureFile) {
      errors.push(`Line ${row.line}: functional traceability row is missing Feature File.`);
      continue;
    }
    const normalized = featureFile.toLowerCase();
    const exists =
      featurePaths.has(normalized) ||
      featurePaths.has(path.posix.join(featureRoot, normalized).toLowerCase()) ||
      [...featurePaths].some((candidate) => candidate.endsWith(`/${normalized}`) || candidate === normalized);
    if (!exists) {
      errors.push(`Line ${row.line}: traceability references missing feature file ${featureFile}.`);
    }
  }

  return { errors, rows: matrix.rows };
}

export function validateMatrixCaseAlignment({ matrixContent = '', features = [] } = {}) {
  const matrix = parseFunctionalTraceabilityMatrix(matrixContent);
  const errors = [];
  const featuresByCase = new Map();

  for (const feature of features) {
    for (const id of feature.ids || []) {
      if (/^TC[-_]/i.test(id)) featuresByCase.set(normalizeId(id), feature);
    }
  }

  for (const row of matrix.rows) {
    if (isProposalOnlyRow(row)) continue;
    const caseId = normalizeId(row.values[normalizeColumn('Test Management Case ID')] || row.caseIds[0] || '');
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '')
      .trim()
      .replaceAll('\\', '/');
    if (!caseId) continue;
    const feature = featuresByCase.get(caseId);
    if (!feature) {
      errors.push(`Line ${row.line}: matrix case ${caseId} has no matching feature with @id:${caseId}.`);
      continue;
    }
    const featurePath = String(feature.file || '')
      .replaceAll('\\', '/')
      .toLowerCase();
    if (featureFile && !featurePath.endsWith(featureFile.toLowerCase())) {
      errors.push(
        `Line ${row.line}: matrix case ${caseId} points to ${featureFile} but feature file is ${feature.file}.`
      );
    }
  }

  return { errors };
}

export function validateMatrixCriterionLinks({ matrixContent = '', proposalContent = '' } = {}) {
  const proposal = parseProposedTestRows(proposalContent);
  if (!proposal.contract.hasCriterionIds) return { errors: [] };

  const matrix = parseFunctionalTraceabilityMatrix(matrixContent);
  const errors = [];
  const matrixCriterionIds = new Set();

  for (const row of matrix.rows) {
    const criterionCell = String(row.values[normalizeColumn('Criterion IDs')] || '').trim();
    for (const id of criterionCell
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean)) {
      matrixCriterionIds.add(id);
    }
  }

  for (const row of proposal.rows) {
    if (row.action !== 'create' || row.evidenceType !== 'feature') continue;
    for (const criterionId of row.criterionIds) {
      if (matrixCriterionIds.size > 0 && !matrixCriterionIds.has(criterionId)) {
        errors.push(`Criterion ${criterionId} from test ${row.testId} is missing from the traceability matrix.`);
      }
    }
  }

  return { errors };
}

export function validateFunctionalTraceability({ matrixContent = '', features = [], featureRoot = 'features' } = {}) {
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

  errors.push(...validateMatrixFeaturePaths({ matrixContent, features, featureRoot }).errors);
  errors.push(...validateMatrixCaseAlignment({ matrixContent, features }).errors);

  return { ok: errors.length === 0, errors, rows: matrix.rows };
}

export function validateTraceabilityArtifacts({
  matrixContent = '',
  normalizedContent = '',
  proposalContent = '',
  features = [],
  featureRoot = 'features'
} = {}) {
  const functional = validateFunctionalTraceability({ matrixContent, features, featureRoot });
  const nfr = validateNfrTraceability({ normalizedContent, matrixContent });
  const criterion = validateMatrixCriterionLinks({ matrixContent, proposalContent });
  const errors = [...functional.errors, ...nfr.errors, ...criterion.errors];
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
