import { normalizeColumn, parseMarkdownTable, resolveArtifactOrMissing } from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_GAP_TYPES = new Set([
  'missing-test',
  'insufficient-coverage',
  'environment-specific',
  'data-specific',
  'unknown'
]);

export async function validateObservabilityIntake(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const intakePath =
    options.intakePath || getConfigValue(config, 'observability.intakePath', '.qa-ai/output/observability-intake.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const intakeAbs = resolveRepoPath(cwd, intakePath, { label: 'observability intake' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: intakeAbs,
    relPath: intakePath,
    allowMissing,
    notFoundMessage: `Observability intake file not found at: ${intakePath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const content = await readText(intakeAbs);
  const table = parseMarkdownTable(content, {
    label: 'Production Signals',
    requiredColumns: [
      'Signal ID',
      'Source',
      'Date',
      'Area',
      'Severity',
      'Linked RF',
      'Linked Test IDs',
      'Gap type',
      'Proposed QA action'
    ]
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Observability intake parse error: ${e}`),
      warnings: []
    };
  }

  const seenSignalIds = new Set();

  for (const row of table.rows) {
    const line = row.line;
    const signalId = String(row.values[normalizeColumn('Signal ID')] || '').trim();
    const gapTypeRaw = String(row.values[normalizeColumn('Gap type')] || '').trim();
    const proposedAction = String(row.values[normalizeColumn('Proposed QA action')] || '').trim();

    if (!signalId) {
      errors.push(`Line ${line}: Missing Signal ID.`);
      continue;
    }

    if (seenSignalIds.has(signalId)) {
      errors.push(`Line ${line}: Duplicate Signal ID "${signalId}".`);
    }
    seenSignalIds.add(signalId);

    const gapType = gapTypeRaw.toLowerCase();
    if (gapType && !ALLOWED_GAP_TYPES.has(gapType)) {
      errors.push(
        `Line ${line}: Invalid gap type "${gapTypeRaw}" (must be one of: missing-test, insufficient-coverage, environment-specific, data-specific, unknown).`
      );
    }

    if (!proposedAction) {
      errors.push(`Line ${line}: Proposed QA action is required for signal "${signalId}".`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
