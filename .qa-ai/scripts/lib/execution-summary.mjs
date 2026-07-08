import {
  loadTraceabilityMatrix,
  normalizeColumn,
  parseMarkdownTable,
  resolveArtifactOrMissing
} from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_STATUSES = new Set(['passed', 'failed', 'skipped', 'not-run', 'blocked']);

export async function validateExecutionSummary(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', '.qa-ai/output/traceability-matrix.md');
  const summaryPath =
    options.summaryPath || getConfigValue(config, 'execution.summaryPath', '.qa-ai/output/execution-summary.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const summaryAbs = resolveRepoPath(cwd, summaryPath, { label: 'execution summary' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: summaryAbs,
    relPath: summaryPath,
    allowMissing,
    notFoundMessage: `Execution summary file not found at: ${summaryPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const commands = getConfigValue(config, 'execution.commands', []);
  const commandIds = new Set(
    Array.isArray(commands) ? commands.map((c) => String(c.id || c.command || '').trim()).filter(Boolean) : []
  );

  const matrix = await loadTraceabilityMatrix(cwd, matrixPath, {
    requiredColumns: ['Test Management Case ID']
  });
  if (!matrix.ok) return matrix;

  const validTestIds = matrix.validTestIds;

  const content = await readText(summaryAbs);
  const table = parseMarkdownTable(content, {
    label: 'Execution Summary',
    requiredColumns: ['Command ID', 'Status', 'Exit code', 'Duration ms', 'Result files', 'Failed Test IDs', 'Notes']
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Execution summary parse error: ${e}`),
      warnings: []
    };
  }

  for (const row of table.rows) {
    const line = row.line;
    const commandIdRaw = String(row.values[normalizeColumn('Command ID')] || '').trim();
    const status = String(row.values[normalizeColumn('Status')] || '')
      .trim()
      .toLowerCase();
    const exitCodeRaw = String(row.values[normalizeColumn('Exit code')] || '').trim();
    const resultFilesRaw = String(row.values[normalizeColumn('Result files')] || '').trim();
    const failedTestIdsRaw = String(row.values[normalizeColumn('Failed Test IDs')] || '').trim();

    if (!commandIdRaw) {
      errors.push(`Line ${line}: Missing Command ID.`);
      continue;
    }

    if (!commandIds.has(commandIdRaw)) {
      errors.push(`Line ${line}: Command ID "${commandIdRaw}" is not defined in execution.commands config.`);
    }

    if (!ALLOWED_STATUSES.has(status)) {
      errors.push(
        `Line ${line}: Invalid status "${status}" (must be one of: passed, failed, skipped, not-run, blocked).`
      );
    }

    if (exitCodeRaw && status !== 'not-run') {
      const exitCode = Number(exitCodeRaw);
      if (Number.isNaN(exitCode) || !Number.isInteger(exitCode)) {
        errors.push(`Line ${line}: Exit code must be numeric, got "${exitCodeRaw}".`);
      }
    }

    if (resultFilesRaw) {
      const filePaths = resultFilesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const filePath of filePaths) {
        try {
          resolveRepoPath(cwd, filePath, { label: 'result file' });
        } catch (err) {
          errors.push(`Line ${line}: Invalid result file path "${filePath}": ${err.message}`);
        }
      }
    }

    if (failedTestIdsRaw) {
      const splitIds = failedTestIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const rawId of splitIds) {
        const { normalizeId } = await import('./gherkin-validate.mjs');
        const normId = normalizeId(rawId);
        if (!validTestIds.has(normId)) {
          errors.push(`Line ${line}: Failed Test ID "${rawId}" is not registered in the traceability matrix.`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
