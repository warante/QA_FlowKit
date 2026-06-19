#!/usr/bin/env node
import path from 'node:path';
import { parseMarkdownTable, normalizeColumn } from './lib/markdown-table.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath,
  toPosixPath
} from './lib/utils.mjs';
import { normalizeId } from './lib/gherkin-validate.mjs';

const args = parseArgs(process.argv);
const cwd = process.cwd();

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
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const logPath = options.logPath || 'qa-ai-output/healing-log.md';
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const logAbsPath = resolveRepoPath(cwd, logPath, { label: 'healing log' });

  if (!(await pathExists(logAbsPath))) {
    if (allowMissing) {
      return { ok: true, errors: [], warnings: [] };
    }
    return {
      ok: false,
      errors: [`Healing log file not found at: ${logPath}`],
      warnings: []
    };
  }

  // Load and parse traceability matrix to verify Test IDs
  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  if (!(await pathExists(matrixAbsPath))) {
    return {
      ok: false,
      errors: [`Traceability matrix file not found at: ${matrixPath}`],
      warnings: []
    };
  }

  const matrixContent = await readText(matrixAbsPath);
  const matrixTable = parseMarkdownTable(matrixContent, {
    label: 'Traceability matrix',
    requiredColumns: ['Test Management Case ID']
  });

  if (matrixTable.errors.length > 0) {
    return {
      ok: false,
      errors: matrixTable.errors.map((e) => `Traceability matrix error: ${e}`),
      warnings: []
    };
  }

  const validTestIds = new Set();
  for (const row of matrixTable.rows) {
    const rawId = String(row.values[normalizeColumn('Test Management Case ID')] || '').trim();
    if (rawId) {
      validTestIds.add(normalizeId(rawId));
    }
  }

  // Configure specs paths for path safety checks
  const uiPath = getConfigValue(config, 'automation.ui.specsPath');
  const apiPath = getConfigValue(config, 'automation.api.specsPath');
  const mobilePath = getConfigValue(config, 'automation.mobile.flowsPath');
  const featurePath = getConfigValue(config, 'gherkin.featurePath', 'features');

  const allowedRoots = [];
  if (uiPath) {
    try {
      allowedRoots.push(resolveRepoPath(cwd, uiPath, { label: 'automation.ui.specsPath' }));
    } catch {
      // Ignore unresolved paths
    }
  }
  if (apiPath) {
    try {
      allowedRoots.push(resolveRepoPath(cwd, apiPath, { label: 'automation.api.specsPath' }));
    } catch {
      // Ignore
    }
  }
  if (mobilePath) {
    try {
      allowedRoots.push(resolveRepoPath(cwd, mobilePath, { label: 'automation.mobile.flowsPath' }));
    } catch {
      // Ignore
    }
  }

  let resolvedFeaturePath;
  try {
    resolvedFeaturePath = resolveRepoPath(cwd, featurePath, { label: 'gherkin.featurePath', allowRoot: true });
  } catch {
    resolvedFeaturePath = path.resolve(cwd, 'features');
  }

  // Parse healing log file
  const logContent = await readText(logAbsPath);
  const requiredColumns = ['Test ID', 'File', 'Failure', 'Repair type', 'Justification'];
  const logTable = parseMarkdownTable(logContent, {
    label: 'Healing log',
    requiredColumns
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

        // Path safety: check inside configured spec paths
        const isAllowedRoot = allowedRoots.some(
          (root) => resolvedFile === root || resolvedFile.startsWith(root + path.sep)
        );
        if (!isAllowedRoot && allowedRoots.length > 0) {
          errors.push(`Line ${line}: File "${fileVal}" is not within any configured automation spec directories.`);
        }

        // Feature path check
        if (resolvedFile === resolvedFeaturePath || resolvedFile.startsWith(resolvedFeaturePath + path.sep)) {
          errors.push(`Line ${line}: File "${fileVal}" is inside the forbidden Gherkin feature directory.`);
        }
      } catch (err) {
        errors.push(`Line ${line}: Invalid file path "${fileVal}": ${err.message}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-healing-log.mjs [options]

Options:
  --path <file>       Override traceability matrix path
  --log <file>        Override healing log file path
  --allow-missing     Return success when healing log is missing
  --json              Output structured JSON format
  --help              Show this help
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI governed healing log validator');
  }

  const result = await validateHealingLog(cwd, {
    matrixPath: args.path,
    logPath: args.log,
    allowMissing: Boolean(args['allow-missing'])
  });

  if (jsonMode) {
    const findings = [];
    for (const error of result.errors) {
      findings.push({ severity: 'error', message: error });
    }
    for (const warning of result.warnings) {
      findings.push({ severity: 'warning', message: warning });
    }
    console.log(JSON.stringify({ ok: result.ok, findings }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.log(`[FAIL] ${error}`);
    }
    console.log(`\nFAILED - ${result.errors.length} healing log validation error(s).`);
    process.exit(1);
  }

  console.log('[PASS] Healing log is fully valid.');
}

if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
