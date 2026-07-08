import { normalizeColumn, parseMarkdownTable, resolveArtifactOrMissing } from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_FAILURE_CLASSES = new Set([
  'product-defect',
  'test-defect',
  'environment',
  'test-data',
  'flaky',
  'unknown',
  'not-executed'
]);

const ALLOWED_CONFIDENCE = new Set(['low', 'medium', 'high']);

export async function validateResultAnalysis(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const analysisPath =
    options.analysisPath || getConfigValue(config, 'analysis.resultAnalysisPath', '.qa-ai/output/result-analysis.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const analysisAbs = resolveRepoPath(cwd, analysisPath, { label: 'result analysis' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: analysisAbs,
    relPath: analysisPath,
    allowMissing,
    notFoundMessage: `Result analysis file not found at: ${analysisPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const content = await readText(analysisAbs);
  const table = parseMarkdownTable(content, {
    label: 'Result Classification',
    requiredColumns: [
      'Test ID',
      'RF',
      'Status',
      'Failure class',
      'Evidence',
      'Suspected cause',
      'Recommended action',
      'Confidence'
    ]
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Result analysis parse error: ${e}`),
      warnings: []
    };
  }

  for (const row of table.rows) {
    const line = row.line;
    const testId = String(row.values[normalizeColumn('Test ID')] || '').trim();
    const status = String(row.values[normalizeColumn('Status')] || '')
      .trim()
      .toLowerCase();
    const failureClassRaw = String(row.values[normalizeColumn('Failure class')] || '').trim();
    const evidence = String(row.values[normalizeColumn('Evidence')] || '').trim();
    const confidenceRaw = String(row.values[normalizeColumn('Confidence')] || '').trim();

    if (!testId) {
      errors.push(`Line ${line}: Missing Test ID.`);
      continue;
    }

    const failureClass = failureClassRaw.toLowerCase();
    if (failureClass && !ALLOWED_FAILURE_CLASSES.has(failureClass)) {
      errors.push(
        `Line ${line}: Invalid failure class "${failureClassRaw}" (must be one of: product-defect, test-defect, environment, test-data, flaky, unknown, not-executed).`
      );
    }

    const confidence = confidenceRaw.toLowerCase();
    if (confidence && !ALLOWED_CONFIDENCE.has(confidence)) {
      errors.push(`Line ${line}: Invalid confidence "${confidenceRaw}" (must be one of: low, medium, high).`);
    }

    if (status !== 'skipped' && status !== 'not-run' && !evidence) {
      errors.push(`Line ${line}: Evidence is required for non-skipped test "${testId}".`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
