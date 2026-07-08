import {
  loadTraceabilityMatrix,
  normalizeColumn,
  parseMarkdownTable,
  resolveArtifactOrMissing
} from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const YES_NO = new Set(['yes', 'no']);

export async function validateExecutionPlan(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', '.qa-ai/output/traceability-matrix.md');
  const planPath = options.planPath || getConfigValue(config, 'execution.planPath', '.qa-ai/output/execution-plan.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const planAbs = resolveRepoPath(cwd, planPath, { label: 'execution plan' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: planAbs,
    relPath: planPath,
    allowMissing,
    notFoundMessage: `Execution plan file not found at: ${planPath}`
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

  const content = await readText(planAbs);
  const table = parseMarkdownTable(content, {
    label: 'Execution Plan',
    requiredColumns: [
      'Command ID',
      'Linked Test IDs',
      'Type',
      'Required',
      'Selection reason',
      'Expected result path',
      'Timeout seconds'
    ]
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Execution plan parse error: ${e}`),
      warnings: []
    };
  }

  for (const row of table.rows) {
    const line = row.line;
    const commandIdRaw = String(row.values[normalizeColumn('Command ID')] || '').trim();
    const linkedTestIdsRaw = String(row.values[normalizeColumn('Linked Test IDs')] || '').trim();
    const required = String(row.values[normalizeColumn('Required')] || '')
      .trim()
      .toLowerCase();
    const resultPathRaw = String(row.values[normalizeColumn('Expected result path')] || '').trim();
    const timeoutRaw = String(row.values[normalizeColumn('Timeout seconds')] || '').trim();

    if (!commandIdRaw) {
      errors.push(`Line ${line}: Missing Command ID.`);
      continue;
    }

    if (!commandIds.has(commandIdRaw)) {
      errors.push(`Line ${line}: Command ID "${commandIdRaw}" is not defined in execution.commands config.`);
    }

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

    if (!YES_NO.has(required)) {
      errors.push(`Line ${line}: Required must be "yes" or "no", got "${required}".`);
    }

    if (timeoutRaw) {
      const timeout = Number(timeoutRaw);
      if (Number.isNaN(timeout) || !Number.isInteger(timeout) || timeout <= 0) {
        errors.push(`Line ${line}: Timeout seconds must be a positive integer, got "${timeoutRaw}".`);
      }
    }

    if (resultPathRaw) {
      try {
        resolveRepoPath(cwd, resultPathRaw, { label: 'expected result path' });
      } catch (err) {
        errors.push(`Line ${line}: Invalid Expected result path "${resultPathRaw}": ${err.message}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
