import path from 'node:path';
import {
  loadTraceabilityMatrix,
  normalizeColumn,
  parseMarkdownTable,
  resolveArtifactOrMissing
} from './markdown-artifact-validator.mjs';
import { getConfigValue, loadQaAiConfig, readText, resolveRepoPath } from './utils.mjs';
import { normalizeId } from './gherkin-validate.mjs';
import { ARTIFACT_PATHS, DEFAULT_FEATURE_PATH } from './artifact-paths.mjs';

const allowedRepairTypes = new Set(['selector', 'wait', 'data', 'other']);

/**
 * Validates the healing log file.
 * @param {string} cwd
 * @param {object} [options]
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateHealingLog(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  const logPath = options.logPath || getConfigValue(config, 'healing.logPath', ARTIFACT_PATHS.healingLog);
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const logAbsPath = resolveRepoPath(cwd, logPath, { label: 'healing log' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: logAbsPath,
    relPath: logPath,
    allowMissing,
    notFoundMessage: `Healing log file not found at: ${logPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) {
    return { ok: true, errors: [], warnings: [] };
  }

  const matrix = await loadTraceabilityMatrix(cwd, matrixPath, {
    requiredColumns: ['Test Management Case ID']
  });
  if (!matrix.ok) return matrix;

  const validTestIds = matrix.validTestIds;

  const uiPath = getConfigValue(config, 'automation.ui.specsPath');
  const apiPath = getConfigValue(config, 'automation.api.specsPath');
  const mobilePath = getConfigValue(config, 'automation.mobile.flowsPath');
  const featurePath = getConfigValue(config, 'gherkin.featurePath', DEFAULT_FEATURE_PATH);

  const allowedRoots = [];
  for (const [cfgPath, label] of [
    [uiPath, 'automation.ui.specsPath'],
    [apiPath, 'automation.api.specsPath'],
    [mobilePath, 'automation.mobile.flowsPath']
  ]) {
    if (!cfgPath) continue;
    try {
      allowedRoots.push(resolveRepoPath(cwd, cfgPath, { label }));
    } catch {
      // Ignore unresolved paths
    }
  }

  let resolvedFeaturePath;
  try {
    resolvedFeaturePath = resolveRepoPath(cwd, featurePath, { label: 'gherkin.featurePath', allowRoot: true });
  } catch {
    resolvedFeaturePath = path.resolve(cwd, DEFAULT_FEATURE_PATH);
  }

  const logContent = await readText(logAbsPath);
  const logTable = parseMarkdownTable(logContent, {
    label: 'Healing log',
    requiredColumns: ['Test ID', 'File', 'Failure', 'Repair type', 'Justification']
  });

  if (logTable.errors.length > 0) {
    return {
      ok: false,
      errors: logTable.errors.map((e) => `Healing log parse error: ${e}`),
      warnings: []
    };
  }

  for (const row of logTable.rows) {
    const line = row.line;
    const testIdRaw = String(row.values[normalizeColumn('Test ID')] || '').trim();
    const fileVal = String(row.values[normalizeColumn('File')] || '').trim();
    const repairTypeRaw = String(row.values[normalizeColumn('Repair type')] || '').trim();
    const justification = String(row.values[normalizeColumn('Justification')] || '').trim();

    if (!testIdRaw) {
      errors.push(`Line ${line}: Missing Test ID.`);
      continue;
    }

    const testId = normalizeId(testIdRaw);
    if (!validTestIds.has(testId)) {
      errors.push(`Line ${line}: Test ID "${testIdRaw}" is not registered in the traceability matrix.`);
    }

    const repairType = repairTypeRaw.toLowerCase();
    if (!allowedRepairTypes.has(repairType)) {
      errors.push(
        `Line ${line}: Invalid repair type "${repairTypeRaw}" (must be one of: selector, wait, data, other).`
      );
    }

    if (repairType === 'other' && justification.length < 20) {
      errors.push(
        `Line ${line}: Justification for "other" repair type must be at least 20 characters (got ${justification.length}).`
      );
    }

    const isDummyFile = !fileVal || ['n/a', 'none', 'null', '-'].includes(fileVal.toLowerCase());
    if (!isDummyFile) {
      if (fileVal.toLowerCase().endsWith('.feature')) {
        errors.push(`Line ${line}: Healing logs must never modify Gherkin design feature files (${fileVal}).`);
        continue;
      }

      try {
        const resolvedFile = resolveRepoPath(cwd, fileVal, { label: 'healing log file' });
        const isAllowedRoot = allowedRoots.some(
          (root) => resolvedFile === root || resolvedFile.startsWith(root + path.sep)
        );
        if (!isAllowedRoot && allowedRoots.length > 0) {
          errors.push(`Line ${line}: File "${fileVal}" is not within any configured automation spec directories.`);
        }

        if (resolvedFile === resolvedFeaturePath || resolvedFile.startsWith(resolvedFeaturePath + path.sep)) {
          errors.push(`Line ${line}: File "${fileVal}" is inside the forbidden Gherkin feature directory.`);
        }
      } catch (err) {
        errors.push(`Line ${line}: Invalid file path "${fileVal}": ${err.message}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
