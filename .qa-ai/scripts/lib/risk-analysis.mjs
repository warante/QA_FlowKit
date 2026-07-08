import { normalizeColumn, parseMarkdownTable, resolveArtifactOrMissing } from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';

const ALLOWED_DEPTHS = new Set(['smoke', 'standard', 'extended', 'enterprise-gate']);

export async function validateRiskAnalysis(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const analysisPath =
    options.analysisPath || getConfigValue(config, 'risk.analysisPath', '.qa-ai/output/risk-analysis.md');
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const analysisAbs = resolveRepoPath(cwd, analysisPath, { label: 'risk analysis' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: analysisAbs,
    relPath: analysisPath,
    allowMissing,
    notFoundMessage: `Risk analysis file not found at: ${analysisPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) return { ok: true, errors: [], warnings: [] };

  const content = await readText(analysisAbs);

  const table = parseMarkdownTable(content, {
    label: 'Risk Analysis',
    requiredColumns: [
      'RF',
      'Criterion IDs',
      'Business impact',
      'Failure probability',
      'Complexity',
      'Data sensitivity',
      'Security/privacy impact',
      'AI impact',
      'Risk score',
      'Recommended depth',
      'Rationale'
    ]
  });

  if (table.errors.length > 0) {
    return { ok: false, errors: table.errors.map((e) => `Risk analysis parse error: ${e}`), warnings: [] };
  }

  const seenRfs = new Set();

  for (const row of table.rows) {
    const line = row.line;
    const rf = String(row.values[normalizeColumn('RF')] || '').trim();

    if (!rf) {
      errors.push(`Line ${line}: Missing RF value.`);
      continue;
    }

    if (seenRfs.has(rf)) {
      errors.push(`Line ${line}: Duplicate RF "${rf}".`);
    }
    seenRfs.add(rf);

    const scoreRaw = String(row.values[normalizeColumn('Risk score')] || '').trim();
    if (!scoreRaw) {
      errors.push(`Line ${line}: Missing risk score for RF "${rf}".`);
    } else {
      const score = Number(scoreRaw);
      if (Number.isNaN(score) || !Number.isInteger(score) || score < 1) {
        errors.push(`Line ${line}: Risk score must be a positive integer, got "${scoreRaw}".`);
      }
    }

    const depth = String(row.values[normalizeColumn('Recommended depth')] || '')
      .trim()
      .toLowerCase();
    if (!depth) {
      errors.push(`Line ${line}: Missing recommended depth for RF "${rf}".`);
    } else if (!ALLOWED_DEPTHS.has(depth)) {
      errors.push(
        `Line ${line}: Invalid recommended depth "${depth}" (must be one of: smoke, standard, extended, enterprise-gate).`
      );
    }

    const rationale = String(row.values[normalizeColumn('Rationale')] || '').trim();
    if (rationale.length < 20) {
      errors.push(`Line ${line}: Rationale for RF "${rf}" must be at least 20 characters (got ${rationale.length}).`);
    }

    const impactRaw = String(row.values[normalizeColumn('Business impact')] || '').trim();
    if (impactRaw) {
      const impact = Number(impactRaw);
      if (!Number.isNaN(impact) && (impact < 1 || impact > 5)) {
        errors.push(`Line ${line}: Business impact for RF "${rf}" must be 1-5, got "${impactRaw}".`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
