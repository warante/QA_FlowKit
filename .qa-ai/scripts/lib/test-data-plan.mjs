import {
  loadTraceabilityMatrix,
  normalizeColumn,
  parseMarkdownTable,
  resolveArtifactOrMissing
} from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_SOURCES = new Set([
  'synthetic',
  'seed',
  'mock',
  'stub',
  'recording',
  'file',
  'computed',
  'production-copy'
]);

const PRODUCTION_COPY_SOURCE = 'production-copy';
const SYNTHETIC_SOURCES = new Set(['synthetic', 'seed']);

export async function validateTestDataPlan(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', '.qa-ai/output/traceability-matrix.md');
  const planPath = options.planPath || getConfigValue(config, 'testData.planPath', '.qa-ai/output/test-data-plan.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const planAbs = resolveRepoPath(cwd, planPath, { label: 'test data plan' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: planAbs,
    relPath: planPath,
    allowMissing,
    notFoundMessage: `Test data plan file not found at: ${planPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const matrix = await loadTraceabilityMatrix(cwd, matrixPath, {
    requiredColumns: ['Test Management Case ID']
  });
  if (!matrix.ok) return matrix;

  const validTestIds = matrix.validTestIds;
  const allowProductionCopies = getConfigValue(config, 'testData.allowProductionCopies', false);
  const anonymizationRequired = getConfigValue(config, 'testData.anonymizationRequired', true);

  const content = await readText(planAbs);
  const table = parseMarkdownTable(content, {
    label: 'Data Sets',
    requiredColumns: ['Data ID', 'Linked Test IDs', 'Purpose', 'Source', 'Synthetic', 'Sensitive', 'Reset needed']
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Test data plan parse error: ${e}`),
      warnings: []
    };
  }

  const seenDataIds = new Set();

  for (const row of table.rows) {
    const line = row.line;
    const dataId = String(row.values[normalizeColumn('Data ID')] || '').trim();
    const linkedTestIdsRaw = String(row.values[normalizeColumn('Linked Test IDs')] || '').trim();
    const sourceRaw = String(row.values[normalizeColumn('Source')] || '').trim();
    const syntheticRaw = String(row.values[normalizeColumn('Synthetic')] || '').trim();
    const sensitiveRaw = String(row.values[normalizeColumn('Sensitive')] || '').trim();
    const purpose = String(row.values[normalizeColumn('Purpose')] || '').trim();

    if (!dataId) {
      errors.push(`Line ${line}: Missing Data ID.`);
      continue;
    }

    if (seenDataIds.has(dataId)) {
      errors.push(`Line ${line}: Duplicate Data ID "${dataId}".`);
    }
    seenDataIds.add(dataId);

    if (linkedTestIdsRaw) {
      const splitIds = linkedTestIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const rawId of splitIds) {
        const { normalizeId } = await import('./gherkin-validate.mjs');
        const normId = normalizeId(rawId);
        if (!validTestIds.has(normId)) {
          errors.push(`Line ${line}: Linked Test ID "${rawId}" is not registered in the traceability matrix.`);
        }
      }
    }

    const source = sourceRaw.toLowerCase();
    if (!ALLOWED_SOURCES.has(source)) {
      errors.push(
        `Line ${line}: Invalid source "${sourceRaw}" (must be one of: synthetic, seed, mock, stub, recording, file, computed, production-copy).`
      );
    }

    if (source === PRODUCTION_COPY_SOURCE && !allowProductionCopies) {
      errors.push(
        `Line ${line}: Source "production-copy" is not allowed (testData.allowProductionCopies is not enabled in config).`
      );
    }

    const synthetic = syntheticRaw.toLowerCase();
    if (source && SYNTHETIC_SOURCES.has(source) && synthetic !== 'yes') {
      errors.push(`Line ${line}: Source "${sourceRaw}" requires Synthetic=yes, got "${syntheticRaw}".`);
    }

    const sensitive = sensitiveRaw.toLowerCase();
    if (sensitive === 'yes' && anonymizationRequired && !purpose.toLowerCase().includes('anonymiz')) {
      warnings.push(
        `Line ${line}: Sensitive data set "${dataId}" should include anonymization notes in the Purpose or notes section.`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
