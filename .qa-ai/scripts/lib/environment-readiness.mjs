import { normalizeColumn, parseMarkdownTable, resolveArtifactOrMissing } from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_STATUSES = new Set(['pass', 'warn', 'fail', 'not-run', 'not-applicable']);

export async function validateEnvironmentReadiness(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const readinessPath =
    options.readinessPath ||
    getConfigValue(config, 'environments.readinessPath', '.qa-ai/output/environment-readiness.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const readinessAbs = resolveRepoPath(cwd, readinessPath, { label: 'environment readiness' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: readinessAbs,
    relPath: readinessPath,
    allowMissing,
    notFoundMessage: `Environment readiness file not found at: ${readinessPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const content = await readText(readinessAbs);
  const table = parseMarkdownTable(content, {
    label: 'Environment Checks',
    requiredColumns: ['Check ID', 'Type', 'Target', 'Required', 'Status', 'Evidence', 'Blocking', 'Remediation']
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Environment readiness parse error: ${e}`),
      warnings: []
    };
  }

  const seenCheckIds = new Set();

  for (const row of table.rows) {
    const line = row.line;
    const checkId = String(row.values[normalizeColumn('Check ID')] || '').trim();
    const status = String(row.values[normalizeColumn('Status')] || '')
      .trim()
      .toLowerCase();
    const evidence = String(row.values[normalizeColumn('Evidence')] || '').trim();
    const remediation = String(row.values[normalizeColumn('Remediation')] || '').trim();

    if (!checkId) {
      errors.push(`Line ${line}: Missing Check ID.`);
      continue;
    }

    if (seenCheckIds.has(checkId)) {
      errors.push(`Line ${line}: Duplicate Check ID "${checkId}".`);
    }
    seenCheckIds.add(checkId);

    if (!ALLOWED_STATUSES.has(status)) {
      errors.push(
        `Line ${line}: Invalid status "${status}" (must be one of: pass, warn, fail, not-run, not-applicable).`
      );
    }

    if ((status === 'pass' || status === 'fail') && !evidence) {
      errors.push(`Line ${line}: Evidence is required for status "${status}" on check "${checkId}".`);
    }

    if (status === 'fail' && !remediation) {
      errors.push(`Line ${line}: Remediation is required for failed check "${checkId}".`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
