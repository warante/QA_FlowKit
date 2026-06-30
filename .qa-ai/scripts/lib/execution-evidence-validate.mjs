import fs from 'node:fs/promises';
import path from 'node:path';
import { parseJUnitXml, parseCucumberJson, extractTestIds } from './execution-results.mjs';
import { parseEvalJson } from './eval-results.mjs';
import { parseMarkdownTable, normalizeColumn } from './markdown-table.mjs';
import { getConfigValue, loadQaAiConfig, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { getTestManagementMappingFile } from './test-management-config.mjs';
import { normalizeId } from './gherkin-validate.mjs';
import { resolveGlobs } from './glob.mjs';

function rowMarksAiComponent(row) {
  const values = Object.entries(row.values || {});
  for (const [key, value] of values) {
    const normalizedKey = normalizeColumn(key);
    const text = String(value || '')
      .trim()
      .toLowerCase();
    if (normalizedKey === normalizeColumn('AI component') && ['yes', 'true', 'si', 'sí'].includes(text)) {
      return true;
    }
    if (text.includes('@ai-component') || text.includes('ai component: yes') || text.includes('ai component=yes')) {
      return true;
    }
  }
  return false;
}

function hasStatisticalAssertion(content) {
  return (
    /\bThen\s+.+?\s+should\s+satisfy\s+.+?\s+in\s+at\s+least\s+\d+%\s+of\s+\d+\s+runs\b/i.test(content) ||
    /\bEntonces\s+.+?\s+debe\s+cumplir\s+.+?\s+en\s+al\s+menos\s+\d+%\s+de\s+\d+\s+ejecuciones\b/i.test(content)
  );
}

async function inspectFeatureForAi(cwd, featureFile) {
  if (!featureFile) {
    return { isAiComponent: false, hasStatisticalAssertion: false };
  }
  try {
    const featureAbsPath = resolveRepoPath(cwd, featureFile, { label: 'feature file' });
    if (!(await pathExists(featureAbsPath))) {
      return { isAiComponent: false, hasStatisticalAssertion: false };
    }
    const content = await readText(featureAbsPath);
    return {
      isAiComponent: /(^|\s)@ai-component(\s|$)/i.test(content),
      hasStatisticalAssertion: hasStatisticalAssertion(content)
    };
  } catch {
    return { isAiComponent: false, hasStatisticalAssertion: false };
  }
}

function caseLinksRf(caseObj, rf) {
  const rfId = normalizeId(rf);
  if (!rfId) return false;
  if (caseObj.rfId && normalizeId(caseObj.rfId) === rfId) return true;
  const text = normalizeId([caseObj.id, caseObj.name, caseObj.message].filter(Boolean).join(' '));
  return text.includes(rfId);
}

async function parseEvalEvidenceFiles(files, errors) {
  const evalCases = [];
  for (const file of files) {
    const filename = path.basename(file);
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.json') {
      errors.push(`Unsupported file extension for eval results file ${filename}: must be .json`);
      continue;
    }
    try {
      const text = await fs.readFile(file, 'utf8');
      const parsed = parseEvalJson(text, filename);
      evalCases.push(...parsed.cases);
    } catch (error) {
      errors.push(`Failed to parse eval results file ${filename}: ${error.message}`);
    }
  }
  return evalCases;
}

async function validateAiEvalEvidence({ cwd, evalResultsPaths, aiRfInfo, allowMissing, errors, report }) {
  if (aiRfInfo.size === 0) return;

  const files = await resolveGlobs(cwd, evalResultsPaths);
  if (files.length === 0) {
    if (!allowMissing) {
      errors.push(`No eval results files found for AI RF evidence matching pattern(s): ${evalResultsPaths.join(', ')}`);
    }
    return;
  }

  const evalCases = await parseEvalEvidenceFiles(files, errors);
  if (errors.length > 0) return;

  for (const [rf, info] of aiRfInfo.entries()) {
    const linkedCases = evalCases.filter((caseObj) => caseLinksRf(caseObj, rf));
    const rfReport = report[rf] || {
      totalTests: 0,
      automatedTests: 0,
      passed: 0,
      failed: 0,
      quarantinedFailed: 0,
      skipped: 0,
      missing: 0,
      tests: []
    };
    report[rf] = rfReport;
    rfReport.aiComponent = true;
    rfReport.evalCases = linkedCases.map((caseObj) => ({
      id: caseObj.id,
      name: caseObj.name,
      status: caseObj.status,
      score: caseObj.score,
      threshold: caseObj.threshold
    }));

    if (linkedCases.length === 0) {
      if (!allowMissing) {
        errors.push(`Missing eval evidence for AI RF ${rf}.`);
      }
      continue;
    }

    for (const caseObj of linkedCases) {
      if (caseObj.status !== 'passed') {
        errors.push(
          `Eval failure for AI RF ${rf} in case "${caseObj.name || caseObj.id}": ${caseObj.message || 'failed'}`
        );
      }
    }

    if (info.hasStatisticalAssertion) {
      const scoredCases = linkedCases.filter(
        (caseObj) => typeof caseObj.score === 'number' && typeof caseObj.threshold === 'number'
      );
      if (scoredCases.length === 0) {
        errors.push(`Missing score/threshold eval evidence for statistical AI RF ${rf}.`);
        continue;
      }
      for (const caseObj of scoredCases) {
        if (caseObj.score < caseObj.threshold) {
          errors.push(
            `Statistical eval threshold failed for AI RF ${rf} in case "${caseObj.name || caseObj.id}": score ${caseObj.score} < threshold ${caseObj.threshold}.`
          );
        }
      }
    }
  }
}

/**
 * Validates execution evidence files against the traceability matrix.
 * @param {string} cwd
 * @param {object} [options]
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], report: object }>}
 */
export async function validateExecutionEvidence(cwd, options = {}) {
  const errors = [];
  const warnings = [];
  const report = {};

  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const mappingFile = options.mappingFile || getTestManagementMappingFile(config);
  const resultsPaths = options.resultsPaths || getConfigValue(config, 'execution.resultsPaths', []);
  const evalResultsPaths = options.evalResultsPaths || getConfigValue(config, 'execution.evalResultsPaths', []);
  const aiTestingEnabled = Boolean(getConfigValue(config, 'aiTesting.enabled', false));
  const allowMissing = options.allowMissing !== undefined ? options.allowMissing : false;
  const shouldValidateExecution = resultsPaths.length > 0;

  if (!shouldValidateExecution && !aiTestingEnabled) {
    return { ok: true, errors: [], warnings: [], report: {} };
  }

  // 1. Resolve globs to find results files
  const files = shouldValidateExecution ? await resolveGlobs(cwd, resultsPaths) : [];

  // 2. Parse results files
  const parsedCases = [];
  if (shouldValidateExecution) {
    if (files.length === 0) {
      if (!allowMissing) {
        errors.push(`No execution results files found matching pattern(s): ${resultsPaths.join(', ')}`);
      }
    }

    for (const file of files) {
      const filename = path.basename(file);
      const ext = path.extname(file).toLowerCase();
      try {
        const text = await fs.readFile(file, 'utf8');
        let res;
        if (ext === '.xml') {
          res = parseJUnitXml(text, filename);
        } else if (ext === '.json') {
          res = parseCucumberJson(text, filename);
        } else {
          errors.push(`Unsupported file extension for results file ${filename}: must be .xml or .json`);
          continue;
        }
        parsedCases.push(...res.cases);
      } catch (err) {
        errors.push(`Failed to parse results file ${filename}: ${err.message}`);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, report };
  }

  // Map parsed execution results by testcase IDs
  const resultsMap = new Map();
  for (const c of parsedCases) {
    const matchedIds = extractTestIds(c);
    for (const id of matchedIds) {
      const current = resultsMap.get(id) || [];
      current.push(c);
      resultsMap.set(id, current);
    }
  }

  // 3. Load mapping file (for quarantine checks)
  let mappingData = {};
  try {
    const mappingAbsPath = resolveRepoPath(cwd, mappingFile, { label: 'mapping file' });
    if (await pathExists(mappingAbsPath)) {
      mappingData = JSON.parse(await fs.readFile(mappingAbsPath, 'utf8'));
    }
  } catch {
    // Treat as empty mapping if not found or malformed (mapping parser will report it elsewhere)
  }

  const quarantineField = getConfigValue(config, 'execution.quarantine.mappingField', 'quarantined');

  // 4. Load traceability matrix and parse rows
  const matrixAbsPath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  if (!(await pathExists(matrixAbsPath))) {
    if (allowMissing) {
      return { ok: true, errors: [], warnings: [], report: {} };
    }
    return { ok: false, errors: [`Traceability matrix file not found at: ${matrixPath}`], warnings: [], report: {} };
  }

  const matrixContent = await readText(matrixAbsPath);
  const requiredColumns = [
    'Requirement Source',
    'RF',
    'Feature File',
    'Test Management Case ID',
    'Type',
    'Priority',
    'Automation Status'
  ];
  const table = parseMarkdownTable(matrixContent, {
    label: 'Traceability matrix',
    requiredColumns
  });

  if (table.errors.length > 0) {
    errors.push(...table.errors.map((e) => `Traceability matrix parse error: ${e}`));
    return { ok: false, errors, warnings, report };
  }

  // Process rows
  const aiRfInfo = new Map();
  for (const row of table.rows) {
    const rf = String(row.values[normalizeColumn('RF')] || '').trim();
    if (!rf) continue;

    const caseIdRaw = String(row.values[normalizeColumn('Test Management Case ID')] || '').trim();
    const featureFile = String(row.values[normalizeColumn('Feature File')] || '').trim();
    const type = String(row.values[normalizeColumn('Type')] || '')
      .trim()
      .toLowerCase();
    const autoStatus = String(row.values[normalizeColumn('Automation Status')] || '')
      .trim()
      .toLowerCase();

    const isAutomated = autoStatus === 'automated' || type === 'automated';
    const featureInfo = await inspectFeatureForAi(cwd, featureFile);
    const isAiComponent = aiTestingEnabled && (rowMarksAiComponent(row) || featureInfo.isAiComponent);

    if (!report[rf]) {
      report[rf] = {
        totalTests: 0,
        automatedTests: 0,
        passed: 0,
        failed: 0,
        quarantinedFailed: 0,
        skipped: 0,
        missing: 0,
        tests: []
      };
    }

    const rfReport = report[rf];
    if (isAiComponent) {
      rfReport.aiComponent = true;
      const current = aiRfInfo.get(rf) || { hasStatisticalAssertion: false };
      current.hasStatisticalAssertion = current.hasStatisticalAssertion || featureInfo.hasStatisticalAssertion;
      aiRfInfo.set(rf, current);
    }
    rfReport.totalTests += 1;

    if (!isAutomated) {
      rfReport.tests.push({
        caseId: caseIdRaw,
        automated: false,
        status: 'manual'
      });
      continue;
    }

    rfReport.automatedTests += 1;

    if (!shouldValidateExecution) {
      rfReport.tests.push({
        caseId: caseIdRaw,
        automated: true,
        status: 'not-validated'
      });
      continue;
    }

    const caseId = normalizeId(caseIdRaw);

    // Find execution results matching this case ID
    const runResults = resultsMap.get(caseId) || [];

    if (runResults.length === 0) {
      rfReport.missing += 1;
      rfReport.tests.push({
        caseId: caseIdRaw,
        automated: true,
        status: 'missing'
      });

      if (!allowMissing) {
        errors.push(`Missing execution results for automated test ID "${caseIdRaw}" linked to ${rf}.`);
      }
      continue;
    }

    // Determine final status from runs (failed if any run failed)
    let finalStatus = 'passed';
    let failMessage = '';
    let hasSkipped = false;

    for (const run of runResults) {
      if (run.status === 'failed') {
        finalStatus = 'failed';
        failMessage = run.message || 'Test failed without explicit details';
        break;
      } else if (run.status === 'skipped') {
        hasSkipped = true;
      }
    }

    if (finalStatus === 'passed' && hasSkipped) {
      finalStatus = 'skipped';
    }

    if (finalStatus === 'passed') {
      rfReport.passed += 1;
      rfReport.tests.push({
        caseId: caseIdRaw,
        automated: true,
        status: 'passed'
      });
    } else if (finalStatus === 'skipped') {
      rfReport.skipped += 1;
      rfReport.tests.push({
        caseId: caseIdRaw,
        automated: true,
        status: 'skipped'
      });
    } else {
      // Failed case: check if quarantined
      const mappingEntry = mappingData[caseIdRaw] || mappingData[featureFile] || {};
      const isQuarantined = Boolean(mappingEntry[quarantineField]);
      const reason = mappingEntry.quarantineReason || 'No reason provided';
      const lastReviewed = mappingEntry.lastReviewedAt || 'Unknown';

      if (isQuarantined) {
        rfReport.quarantinedFailed += 1;
        rfReport.tests.push({
          caseId: caseIdRaw,
          automated: true,
          status: 'quarantined-failed',
          reason
        });

        warnings.push(
          `[WARN] Test case "${caseIdRaw}" failed but is quarantined. Reason: "${reason}" (Reviewed: ${lastReviewed}).`
        );
      } else {
        rfReport.failed += 1;
        rfReport.tests.push({
          caseId: caseIdRaw,
          automated: true,
          status: 'failed',
          message: failMessage
        });

        errors.push(`Execution failure in test case "${caseIdRaw}" linked to ${rf}: ${failMessage}`);
      }
    }
  }

  // Calculate RF statuses
  for (const rf of Object.keys(report)) {
    const rfReport = report[rf];
    if (rfReport.failed > 0) {
      rfReport.status = 'failed';
    } else if (rfReport.quarantinedFailed > 0) {
      rfReport.status = 'quarantined-failed';
    } else if (rfReport.missing > 0) {
      rfReport.status = 'missing';
    } else {
      rfReport.status = 'passed';
    }
  }

  if (aiTestingEnabled && aiRfInfo.size > 0) {
    await validateAiEvalEvidence({
      cwd,
      evalResultsPaths,
      aiRfInfo,
      allowMissing,
      errors,
      report
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    report
  };
}
