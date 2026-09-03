import fs from 'node:fs/promises';
import path from 'node:path';
import { parseJUnitXml, parseCucumberJson, extractTestIds } from './execution-results.mjs';
import { parseMarkdownTable, normalizeColumn } from './markdown-table.mjs';
import { functionalMatrixContent } from './markdown-section.mjs';
import { getConfigValue, loadQaAiConfig, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';
import { resolveGlobs } from './glob.mjs';
import { normalizeId } from './gherkin-validate.mjs';

const REQUIRED_COLUMNS = ['RF', 'Feature File', 'Test Management Case ID', 'Automation Status'];

/**
 * Parse functional traceability matrix to extract RF-to-test mappings
 */
function parseTraceabilityMatrix(content) {
  const table = parseMarkdownTable(functionalMatrixContent(content), {
    label: 'Traceability matrix',
    requiredColumns: REQUIRED_COLUMNS
  });

  if (table.errors.length > 0) {
    return { rows: [], errors: table.errors };
  }

  const rows = [];
  for (const row of table.rows) {
    const rf = String(row.values[normalizeColumn('RF')] || '').trim();
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();
    const caseId = String(row.values[normalizeColumn('Test Management Case ID')] || '').trim();
    const automationStatus = String(row.values[normalizeColumn('Automation Status')] || '').trim();

    if (!rf || !caseId) continue;

    rows.push({
      rfId: normalizeId(rf),
      featureFile,
      caseId: normalizeId(caseId),
      automationStatus: automationStatus.toLowerCase(),
      line: row.line
    });
  }

  return { rows, errors: [] };
}

/**
 * Parse execution results from JUnit XML or Cucumber JSON
 */
async function parseExecutionResults(cwd, resultsPaths) {
  const files = await resolveGlobs(cwd, resultsPaths);
  const results = [];
  const errors = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const filename = path.basename(file);

    try {
      const text = await fs.readFile(file, 'utf8');

      if (ext === '.xml') {
        const parsed = parseJUnitXml(text, filename);
        for (const tc of parsed.cases) {
          const testIds = extractTestIds(tc);
          results.push({
            file,
            format: 'junit',
            testId: testIds[0] || tc.name,
            name: tc.name,
            status: tc.status,
            durationMs: tc.durationMs || 0,
            message: tc.message || ''
          });
        }
      } else if (ext === '.json') {
        const parsed = parseCucumberJson(text, filename);
        for (const tc of parsed.cases) {
          const testIds = extractTestIds(tc);
          results.push({
            file,
            format: 'cucumber',
            testId: testIds[0] || tc.name,
            name: tc.name,
            status: tc.status,
            durationMs: tc.durationMs || 0,
            message: tc.message || ''
          });
        }
      } else {
        errors.push(`Unsupported file extension for results file ${filename}: must be .xml or .json`);
      }
    } catch (error) {
      errors.push(`Failed to parse results file ${filename}: ${error.message}`);
    }
  }

  return { results, errors };
}

/**
 * Link execution results to RFs via traceability matrix
 */
export function linkExecutionToTraceability(matrixRows, executionResults) {
  const linkedResults = [];
  const unlinkedTests = [];
  const rfCoverage = new Map();

  // Build case-to-RF mapping
  const caseToRf = new Map();
  for (const row of matrixRows) {
    if (row.caseId) {
      caseToRf.set(row.caseId, row.rfId);
    }
  }

  // Link each execution result
  for (const result of executionResults) {
    const normalizedTestId = normalizeId(result.testId);
    const rfId = caseToRf.get(normalizedTestId);

    const linked = {
      ...result,
      rfId: rfId || null,
      traceabilityComplete: Boolean(rfId)
    };

    if (rfId) {
      linkedResults.push(linked);

      // Update RF coverage
      if (!rfCoverage.has(rfId)) {
        rfCoverage.set(rfId, {
          rfId,
          totalTests: 0,
          passed: 0,
          failed: 0,
          skipped: 0
        });
      }

      const rf = rfCoverage.get(rfId);
      rf.totalTests++;
      if (result.status === 'passed') rf.passed++;
      else if (result.status === 'failed') rf.failed++;
      else if (result.status === 'skipped') rf.skipped++;
    } else {
      unlinkedTests.push(linked);
    }
  }

  return {
    linkedResults,
    unlinkedTests,
    rfCoverage: Array.from(rfCoverage.values())
  };
}

/**
 * Compute execution traceability metrics
 */
export function computeExecutionTraceabilityMetrics(matrixRows, executionResults) {
  const { linkedResults, unlinkedTests, rfCoverage } = linkExecutionToTraceability(matrixRows, executionResults);

  // Find RFs not validated
  const validatedRfs = new Set(rfCoverage.map((r) => r.rfId));
  const allRfs = new Set(matrixRows.map((r) => r.rfId));
  const notValidatedRfs = Array.from(allRfs).filter((rf) => !validatedRfs.has(rf));

  const totalTests = executionResults.length;
  const linkedToRf = linkedResults.length;
  const unlinked = unlinkedTests.length;
  const linkedPercent = totalTests > 0 ? Math.round((linkedToRf / totalTests) * 100) : 0;

  const totalRfs = allRfs.size;
  const validatedRfCount = validatedRfs.size;
  const rfValidationPercent = totalRfs > 0 ? Math.round((validatedRfCount / totalRfs) * 100) : 0;

  return {
    summary: {
      totalTests,
      linkedToRf,
      unlinkedTests: unlinked,
      linkedPercent,
      totalRfs,
      validatedRfs: validatedRfCount,
      notValidatedRfs: notValidatedRfs.length,
      rfValidationPercent
    },
    rfCoverage,
    unlinkedTests,
    notValidatedRfs: notValidatedRfs.sort()
  };
}

/**
 * Format execution traceability report as Markdown
 */
export function formatExecutionTraceabilityReport(metrics) {
  const s = metrics.summary;
  const lines = [];

  lines.push('# Execution Traceability Report');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| ------ | ----- |');
  lines.push(`| Total Tests Executed | ${s.totalTests} |`);
  lines.push(`| Linked to RF | ${s.linkedToRf} (${s.linkedPercent}%) |`);
  lines.push(`| Unlinked Tests | ${s.unlinkedTests} (${100 - s.linkedPercent}%) |`);
  lines.push(`| RFs Validated | ${s.validatedRfs}/${s.totalRfs} (${s.rfValidationPercent}%) |`);
  lines.push(`| RFs Not Validated | ${s.notValidatedRfs} |`);

  if (metrics.unlinkedTests.length > 0) {
    lines.push('');
    lines.push('## Unlinked Tests');
    lines.push('');
    lines.push('| Test ID | Test Name | Issue | Recommendation |');
    lines.push('| ------- | --------- | ----- | -------------- |');
    for (const test of metrics.unlinkedTests.slice(0, 20)) {
      lines.push(
        `| ${test.testId} | ${test.name} | Missing @rf: tag or not in matrix | Add @rf: tag or update traceability matrix |`
      );
    }
    if (metrics.unlinkedTests.length > 20) {
      lines.push(`| ... | ${metrics.unlinkedTests.length - 20} more tests | - | - |`);
    }
  }

  if (metrics.notValidatedRfs.length > 0) {
    lines.push('');
    lines.push('## RFs Not Validated');
    lines.push('');
    lines.push('| RF ID | Reason | Risk |');
    lines.push('| ----- | ------ | ---- |');
    for (const rf of metrics.notValidatedRfs.slice(0, 20)) {
      lines.push(`| ${rf} | No tests executed | High |`);
    }
    if (metrics.notValidatedRfs.length > 20) {
      lines.push(`| ... | ${metrics.notValidatedRfs.length - 20} more RFs | - |`);
    }
  }

  if (metrics.rfCoverage.length > 0) {
    lines.push('');
    lines.push('## RF Coverage Details');
    lines.push('');
    lines.push('| RF ID | Total Tests | Passed | Failed | Skipped | Pass Rate |');
    lines.push('| ----- | ----------- | ------ | ------ | ------- | --------- |');
    for (const rf of metrics.rfCoverage) {
      const passRate = rf.totalTests > 0 ? Math.round((rf.passed / rf.totalTests) * 100) : 0;
      lines.push(`| ${rf.rfId} | ${rf.totalTests} | ${rf.passed} | ${rf.failed} | ${rf.skipped} | ${passRate}% |`);
    }
  }

  return lines.join('\n');
}

/**
 * Main function to compute execution traceability
 */
export async function computeExecutionTraceability(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  const resultsPaths = options.resultsPaths || getConfigValue(config, 'execution.resultsPaths', []);

  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });

  if (!(await pathExists(matrixAbsPath))) {
    return {
      ok: false,
      errors: [`Traceability matrix not found at ${matrixPath}`],
      warnings: [],
      metrics: null
    };
  }

  const matrixContent = await readText(matrixAbsPath);
  const { rows: matrixRows, errors: matrixErrors } = parseTraceabilityMatrix(matrixContent);

  if (matrixErrors.length > 0) {
    return {
      ok: false,
      errors: matrixErrors,
      warnings: [],
      metrics: null
    };
  }

  const { results: executionResults, errors: parseErrors } = await parseExecutionResults(cwd, resultsPaths);

  if (parseErrors.length > 0 && executionResults.length === 0) {
    return {
      ok: false,
      errors: parseErrors,
      warnings: [],
      metrics: null
    };
  }

  const metrics = computeExecutionTraceabilityMetrics(matrixRows, executionResults);

  return {
    ok: true,
    errors: [],
    warnings: parseErrors,
    metrics
  };
}
