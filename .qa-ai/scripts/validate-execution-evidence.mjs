#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseJUnitXml, parseCucumberJson, extractTestIds } from './lib/execution-results.mjs';
import { parseEvalJson } from './lib/eval-results.mjs';
import { parseMarkdownTable, normalizeColumn } from './lib/markdown-table.mjs';
import {
  getConfigValue,
  loadQaAiConfig,
  logHeader,
  parseArgs,
  pathExists,
  readText,
  resolveRepoPath,
  toPosixPath,
  listFilesRecursive
} from './lib/utils.mjs';
import { getTestManagementMappingFile } from './lib/test-management-config.mjs';
import { normalizeId } from './lib/gherkin-validate.mjs';

const args = parseArgs(process.argv);
const cwd = process.cwd();

// Core glob to regex helper
export function globToRegex(globPattern) {
  let normalized = globPattern.replaceAll('\\', '/');

  // Replace wildcards with unique placeholders
  normalized = normalized.replaceAll('**/', '__DOUBLE_STAR_SLASH__');
  normalized = normalized.replaceAll('**', '__DOUBLE_STAR__');
  normalized = normalized.replaceAll('*', '__STAR__');
  normalized = normalized.replaceAll('?', '__QUESTION__');

  // Escape regex special characters
  let regexStr = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  // Replace placeholders with final regex patterns
  regexStr = regexStr.replaceAll('__DOUBLE_STAR_SLASH__', '(?:.*/)?');
  regexStr = regexStr.replaceAll('__DOUBLE_STAR__', '.*');
  regexStr = regexStr.replaceAll('__STAR__', '[^/]*');
  regexStr = regexStr.replaceAll('__QUESTION__', '[^/]');

  return new RegExp(`^${regexStr}$`, 'i');
}

// Helper to resolve globs without external dependencies
export async function resolveGlobs(cwd, globs) {
  const matchedFiles = new Set();

  for (const pattern of globs) {
    const trimmed = pattern.trim();
    if (!trimmed) continue;

    if (!trimmed.includes('*') && !trimmed.includes('?')) {
      try {
        const absPath = resolveRepoPath(cwd, trimmed, { label: 'glob resolution' });
        if (await pathExists(absPath)) {
          matchedFiles.add(path.resolve(absPath));
        }
      } catch {
        // Ignore resolution errors
      }
      continue;
    }

    const firstWildcard = trimmed.search(/[*?]/);
    const staticPart = trimmed.slice(0, firstWildcard);
    const lastSlash = staticPart.lastIndexOf('/');
    const lastBackslash = staticPart.lastIndexOf('\\');
    const splitIndex = Math.max(lastSlash, lastBackslash);

    let scanDir = '.';
    if (splitIndex > -1) {
      scanDir = staticPart.slice(0, splitIndex);
    }

    let absScanDir;
    try {
      absScanDir = resolveRepoPath(cwd, scanDir || '.', { label: 'glob scan dir', allowRoot: true });
    } catch {
      continue;
    }

    if (!(await pathExists(absScanDir))) continue;

    const regex = globToRegex(trimmed);
    const allFiles = await listFilesRecursive(absScanDir);

    for (const file of allFiles) {
      const relPath = toPosixPath(path.relative(cwd, file));
      if (regex.test(relPath)) {
        matchedFiles.add(path.resolve(file));
      }
    }
  }

  return Array.from(matchedFiles);
}

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

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/validate-execution-evidence.mjs [options]

Options:
  --path <file>       Override traceability matrix path
  --mapping <file>    Override test management mapping file path
  --allow-missing     Return success when results files or traceability rows lack results
  --json              Output structured JSON format
  --help              Show this help

Validates that real execution results and AI eval evidence match the traceability matrix.
`);
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  const jsonMode = Boolean(args.json);
  if (!jsonMode) {
    logHeader('QA AI execution evidence validator');
  }

  const result = await validateExecutionEvidence(cwd, {
    matrixPath: args.path,
    mappingFile: args.mapping,
    allowMissing: Boolean(args['allow-missing'])
  });

  if (jsonMode) {
    const findings = [];
    for (const error of result.errors) {
      findings.push({ severity: 'error', message: error });
    }
    for (const warning of result.warnings) {
      // Remove prefix [WARN] if it exists
      const cleanMsg = warning.replace(/^\[WARN\]\s*/, '');
      findings.push({ severity: 'warning', message: cleanMsg });
    }

    console.log(
      JSON.stringify(
        {
          ok: result.ok,
          findings,
          report: result.report
        },
        null,
        2
      )
    );
    process.exit(result.ok ? 0 : 1);
  }

  // Standard Text Output
  for (const warning of result.warnings) {
    console.log(warning);
  }

  if (!result.ok) {
    for (const error of result.errors) {
      console.log(`[FAIL] ${error}`);
    }
    console.log(`\nFAILED - ${result.errors.length} execution evidence error(s).`);
    process.exit(1);
  }

  // Print summary of RF coverage
  console.log('[PASS] All linked automated tests and AI eval evidence are valid.');
  console.log('\nRF Execution Summary:');
  for (const [rf, rfReport] of Object.entries(result.report)) {
    console.log(
      `  - ${rf}: status=${rfReport.status} (tests=${rfReport.totalTests}, automated=${rfReport.automatedTests}, passed=${rfReport.passed}, failed=${rfReport.failed}, quarantined=${rfReport.quarantinedFailed}, missing=${rfReport.missing})`
    );
  }
}

// Only run as script if executed directly
if (import.meta.url === `file:///${toPosixPath(process.argv[1])}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
