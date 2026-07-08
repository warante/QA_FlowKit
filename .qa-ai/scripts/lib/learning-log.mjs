import { normalizeColumn, parseMarkdownTable, resolveArtifactOrMissing } from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_SOURCE_TYPES = new Set(['bug', 'healing', 'production-signal', 'review', 'pilot', 'manual']);

const APPROVAL_REQUIRED_PREFIXES = ['.qa-ai/rules/', '.qa-ai/agents/', '.qa-ai/workflows/'];

export async function validateLearningLog(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const logPath = options.logPath || getConfigValue(config, 'learningLoop.logPath', '.qa-ai/output/learning-log.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const logAbs = resolveRepoPath(cwd, logPath, { label: 'learning log' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: logAbs,
    relPath: logPath,
    allowMissing,
    notFoundMessage: `Learning log file not found at: ${logPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const content = await readText(logAbs);
  const table = parseMarkdownTable(content, {
    label: 'Items',
    requiredColumns: [
      'Learning ID',
      'Source type',
      'Source ID',
      'Lesson',
      'Proposed change',
      'Target artifact',
      'Requires approval',
      'Status'
    ]
  });

  if (table.errors.length > 0) {
    return {
      ok: false,
      errors: table.errors.map((e) => `Learning log parse error: ${e}`),
      warnings: []
    };
  }

  const seenLearningIds = new Set();

  for (const row of table.rows) {
    const line = row.line;
    const learningId = String(row.values[normalizeColumn('Learning ID')] || '').trim();
    const sourceTypeRaw = String(row.values[normalizeColumn('Source type')] || '').trim();
    const targetArtifact = String(row.values[normalizeColumn('Target artifact')] || '').trim();
    const requiresApprovalRaw = String(row.values[normalizeColumn('Requires approval')] || '').trim();

    if (!learningId) {
      errors.push(`Line ${line}: Missing Learning ID.`);
      continue;
    }

    if (!learningId.startsWith('LRN-')) {
      errors.push(`Line ${line}: Learning ID "${learningId}" must be prefixed with "LRN-".`);
    }

    if (seenLearningIds.has(learningId)) {
      errors.push(`Line ${line}: Duplicate Learning ID "${learningId}".`);
    }
    seenLearningIds.add(learningId);

    const sourceType = sourceTypeRaw.toLowerCase();
    if (sourceType && !ALLOWED_SOURCE_TYPES.has(sourceType)) {
      errors.push(
        `Line ${line}: Invalid source type "${sourceTypeRaw}" (must be one of: bug, healing, production-signal, review, pilot, manual).`
      );
    }

    if (targetArtifact) {
      try {
        resolveRepoPath(cwd, targetArtifact, { label: 'target artifact' });
      } catch (err) {
        errors.push(`Line ${line}: Invalid Target artifact path "${targetArtifact}": ${err.message}`);
      }

      const normalizedTarget = targetArtifact.replaceAll('\\', '/');
      const needsApproval = APPROVAL_REQUIRED_PREFIXES.some((prefix) => normalizedTarget.startsWith(prefix));
      const requiresApproval = requiresApprovalRaw.toLowerCase();
      if (needsApproval && requiresApproval !== 'yes') {
        errors.push(
          `Line ${line}: Requires approval must be "yes" when target artifact "${targetArtifact}" modifies .qa-ai/rules/, .qa-ai/agents/, or .qa-ai/workflows/.`
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
