#!/usr/bin/env node
import {
  loadTraceabilityMatrix,
  normalizeColumn,
  parseMarkdownTable,
  resolveArtifactOrMissing
} from './lib/markdown-artifact-validator.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  readText,
  resolveRepoPath,
  toPosixPath
} from './lib/utils.mjs';
import { normalizeId } from './lib/gherkin-validate.mjs';

const args = parseArgs(process.argv);
const cwd = process.cwd();

/**
 * Validates the test impact analysis report.
 * @param {string} cwd
 * @param {object} [options]
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateTestImpact(cwd, options = {}) {
  const errors = [];
  const warnings = [];

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const reportPath = options.reportPath || 'qa-ai-output/test-impact-analysis.md';
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;

  const reportAbsPath = resolveRepoPath(cwd, reportPath, { label: 'test impact analysis report' });

  const artifactCheck = await resolveArtifactOrMissing({
    absPath: reportAbsPath,
    relPath: reportPath,
    allowMissing,
    notFoundMessage: `Test impact analysis report file not found at: ${reportPath}`
  });
  if (!artifactCheck.ok) return artifactCheck;
  if (artifactCheck.missing) {
    return { ok: true, errors: [], warnings: [] };
  }

  const matrix = await loadTraceabilityMatrix(cwd, matrixPath, {
    requiredColumns: ['RF', 'Test Management Case ID']
  });
  if (!matrix.ok) return matrix;

  const validTestIds = matrix.validTestIds;
  const validRfs = matrix.validRfs;
  const rfToCases = matrix.rfToCases;

  // Parse test impact report file
  const reportContent = await readText(reportAbsPath);
  const requiredColumns = ['Changed area', 'Affected RF', 'Affected test IDs', 'Inclusion reason'];
  const reportTable = parseMarkdownTable(reportContent, {
    label: 'Test impact analysis table',
    requiredColumns
  });

  if (reportTable.errors.length > 0) {
    return {
      ok: false,
      errors: reportTable.errors.map((e) => `Test impact analysis parse error: ${e}`),
      warnings: []
    };
  }

  const expectedSelectedIds = new Set();
  const declaredAffectedRfs = new Set();

  for (const row of reportTable.rows) {
    const line = row.line;
    const rfRaw = String(row.values[normalizeColumn('Affected RF')] || '').trim();
    const testIdsRaw = String(row.values[normalizeColumn('Affected test IDs')] || '').trim();

    if (!rfRaw) {
      errors.push(`Line ${line}: Missing Affected RF.`);
      continue;
    }

    const rfId = normalizeId(rfRaw);
    if (!validRfs.has(rfId)) {
      errors.push(`Line ${line}: RF "${rfRaw}" is not registered in the traceability matrix.`);
    } else {
      declaredAffectedRfs.add(rfId);
    }

    if (testIdsRaw) {
      const splitIds = testIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const rawId of splitIds) {
        const normId = normalizeId(rawId);
        if (!validTestIds.has(normId)) {
          errors.push(`Line ${line}: Test ID "${rawId}" is not registered in the traceability matrix.`);
        } else {
          expectedSelectedIds.add(normId);
        }
      }
    }
  }

  // Parse Selected Test IDs section
  const lines = reportContent.split(/\r?\n/);
  let inSelectedSection = false;
  const selectedTestIds = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## Selected Test IDs')) {
      inSelectedSection = true;
      continue;
    }
    if (inSelectedSection) {
      if (trimmed.startsWith('#')) {
        break;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const rawId = trimmed.slice(1).trim();
        if (rawId && rawId !== 'CHANGE_ME') {
          selectedTestIds.push(normalizeId(rawId));
        }
      }
    }
  }

  const selectedSet = new Set(selectedTestIds);

  // Union Check: Selected List must equal the union of table's test IDs
  // 1. Check for silent additions
  for (const id of selectedSet) {
    if (!expectedSelectedIds.has(id)) {
      errors.push(`Test ID "${id}" is in the Selected Test IDs list but not in the Impacted Areas table.`);
    }
  }
  // 2. Check for silent removals
  for (const id of expectedSelectedIds) {
    if (!selectedSet.has(id)) {
      errors.push(`Test ID "${id}" is in the Impacted Areas table but missing from the Selected Test IDs list.`);
    }
  }

  // Superset Rule: For every RF listed, all linked test cases must be present
  for (const rfId of declaredAffectedRfs) {
    const linkedCases = rfToCases.get(rfId) || new Set();
    for (const caseId of linkedCases) {
      if (!selectedSet.has(caseId)) {
        errors.push(
          `RF "${rfId}" is affected, so its test case "${caseId}" must be included in the selected test list (Superset Rule).`
        );
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
  console.log(`Usage: node .qa-ai/scripts/validate-test-impact.mjs [options]

Options:
  --path <file>       Override traceability matrix path
  --report <file>     Override test impact report file path
  --allow-missing     Return success when test impact report is missing
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
    logHeader('QA AI governed test impact analysis validator');
  }

  const result = await validateTestImpact(cwd, {
    matrixPath: args.path,
    reportPath: args.report,
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
    console.log(`\nFAILED - ${result.errors.length} test impact validation error(s).`);
    process.exit(1);
  }

  console.log('[PASS] Test impact analysis is fully valid.');
}

if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
