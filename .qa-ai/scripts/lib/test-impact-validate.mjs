import {
  loadTraceabilityMatrix,
  normalizeColumn,
  parseMarkdownTable,
  resolveArtifactOrMissing
} from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';
import { normalizeId } from './gherkin-validate.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';

/**
 * Validates the test impact analysis report.
 * @param {string} cwd
 * @param {object} [options]
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateTestImpact(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  const reportPath = options.reportPath || ARTIFACT_PATHS.testImpactAnalysis;
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const reportAbsPath = resolveRepoPath(cwd, reportPath, { label: 'test impact analysis report' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: reportAbsPath,
    relPath: reportPath,
    allowMissing,
    notFoundMessage: `Test impact analysis report file not found at: ${reportPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) {
    return { ok: true, errors: [], warnings: [] };
  }

  const matrix = await loadTraceabilityMatrix(cwd, matrixPath, {
    requiredColumns: ['RF', 'Test Management Case ID']
  });
  if (!matrix.ok) return matrix;

  const validTestIds = matrix.validTestIds;
  const validRfs = matrix.validRfs;
  const rfToCases = matrix.rfToCases;

  const reportContent = await readText(reportAbsPath);
  const reportTable = parseMarkdownTable(reportContent, {
    label: 'Test impact analysis table',
    requiredColumns: ['Changed area', 'Affected RF', 'Affected test IDs', 'Inclusion reason']
  });

  if (reportTable.errors.length > 0) {
    return {
      ok: false,
      errors: reportTable.errors.map((e) => `Test impact analysis parse error: ${e}`),
      warnings: []
    };
  }

  const expectedSelectedIds = new Set();
  const declaredAffectedRfs = new Set();

  for (const row of reportTable.rows) {
    const line = row.line;
    const rfRaw = String(row.values[normalizeColumn('Affected RF')] || '').trim();
    const testIdsRaw = String(row.values[normalizeColumn('Affected test IDs')] || '').trim();

    if (!rfRaw) {
      errors.push(`Line ${line}: Missing Affected RF.`);
      continue;
    }

    const rfId = normalizeId(rfRaw);
    if (!validRfs.has(rfId)) {
      errors.push(`Line ${line}: RF "${rfRaw}" is not registered in the traceability matrix.`);
    } else {
      declaredAffectedRfs.add(rfId);
    }

    if (testIdsRaw) {
      const splitIds = testIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const rawId of splitIds) {
        const normId = normalizeId(rawId);
        if (!validTestIds.has(normId)) {
          errors.push(`Line ${line}: Test ID "${rawId}" is not registered in the traceability matrix.`);
        } else {
          expectedSelectedIds.add(normId);
        }
      }
    }
  }

  const lines = reportContent.split(/\r?\n/);
  let inSelectedSection = false;
  const selectedTestIds = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## Selected Test IDs')) {
      inSelectedSection = true;
      continue;
    }
    if (inSelectedSection) {
      if (trimmed.startsWith('#')) break;
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const rawId = trimmed.slice(1).trim();
        if (rawId && rawId !== 'CHANGE_ME') {
          selectedTestIds.push(normalizeId(rawId));
        }
      }
    }
  }

  const selectedSet = new Set(selectedTestIds);

  for (const id of selectedSet) {
    if (!expectedSelectedIds.has(id)) {
      errors.push(`Test ID "${id}" is in the Selected Test IDs list but not in the Impacted Areas table.`);
    }
  }
  for (const id of expectedSelectedIds) {
    if (!selectedSet.has(id)) {
      errors.push(`Test ID "${id}" is in the Impacted Areas table but missing from the Selected Test IDs list.`);
    }
  }

  for (const rfId of declaredAffectedRfs) {
    const linkedCases = rfToCases.get(rfId) || new Set();
    for (const caseId of linkedCases) {
      if (!selectedSet.has(caseId)) {
        errors.push(
          `RF "${rfId}" is affected, so its test case "${caseId}" must be included in the selected test list (Superset Rule).`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
