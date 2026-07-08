import { normalizeColumn, parseMarkdownTable, resolveArtifactOrMissing } from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_TYPES = new Set([
  'bug',
  'test-fix',
  'environment-task',
  'data-task',
  'healing',
  'risk-accepted',
  'no-action'
]);

const ALLOWED_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

export async function validateDefectTriage(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const triagePath =
    options.triagePath || getConfigValue(config, 'analysis.defectTriagePath', '.qa-ai/output/defect-triage.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const triageAbs = resolveRepoPath(cwd, triagePath, { label: 'defect triage' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: triageAbs,
    relPath: triagePath,
    allowMissing,
    notFoundMessage: `Defect triage file not found at: ${triagePath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const content = await readText(triageAbs);
  const table = parseMarkdownTable(content, {
    label: 'Proposed Actions',
    requiredColumns: [
      'Action ID',
      'Type',
      'Linked Test IDs',
      'Linked RF',
      'Severity',
      'Owner suggestion',
      'Title',
      'Description',
      'Blocking release',
      'Evidence'
    ]
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Defect triage parse error: ${e}`),
      warnings: []
    };
  }

  const seenActionIds = new Set();

  for (const row of table.rows) {
    const line = row.line;
    const actionId = String(row.values[normalizeColumn('Action ID')] || '').trim();
    const type = String(row.values[normalizeColumn('Type')] || '')
      .trim()
      .toLowerCase();
    const severityRaw = String(row.values[normalizeColumn('Severity')] || '').trim();
    const title = String(row.values[normalizeColumn('Title')] || '').trim();

    if (!actionId) {
      errors.push(`Line ${line}: Missing Action ID.`);
      continue;
    }

    if (!actionId.startsWith('ACT-')) {
      errors.push(`Line ${line}: Action ID "${actionId}" must be prefixed with "ACT-".`);
    }

    if (seenActionIds.has(actionId)) {
      errors.push(`Line ${line}: Duplicate Action ID "${actionId}".`);
    }
    seenActionIds.add(actionId);

    if (!ALLOWED_TYPES.has(type)) {
      errors.push(
        `Line ${line}: Invalid type "${type}" (must be one of: bug, test-fix, environment-task, data-task, healing, risk-accepted, no-action).`
      );
    }

    const severity = severityRaw.toLowerCase();
    if (!ALLOWED_SEVERITIES.has(severity)) {
      errors.push(`Line ${line}: Invalid severity "${severityRaw}" (must be one of: critical, high, medium, low).`);
    }

    if (!title) {
      errors.push(`Line ${line}: Title is required for action "${actionId}".`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
