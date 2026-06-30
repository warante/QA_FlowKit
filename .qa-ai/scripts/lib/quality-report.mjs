import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeAdvisoryMode, isBlockingAdvisoryMode } from './mode-normalize.mjs';
import { getActiveRunId, readRunSnapshot } from './harness-run-store.mjs';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { extractMarkdownSection } from './markdown-section.mjs';
import {
  getConfigValue,
  hashFile,
  listFilesRecursive,
  loadQaAiConfig,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath
} from './utils.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';

const DEFAULT_REPORT_PATH = ARTIFACT_PATHS.gherkinQualityReport;
const DEFAULT_RUBRIC_PATH = '.qa-ai/rules/gherkin-quality.rubric.md';

function addFinding(findings, severity, message, extra = {}) {
  findings.push({ severity, message, ...extra });
}

function parseRubricVersion(content) {
  const match = String(content || '').match(/^rubricVersion:\s*(\d+)\s*$/m);
  return match ? Number(match[1]) : null;
}

export function parseRubricDimensions(content) {
  return [...String(content || '').matchAll(/^##\s+([a-z0-9-]+)\s*$/gm)].map((match) => match[1]);
}

function parseHeaderValue(content, label) {
  const pattern = new RegExp(`^-\\s*${label}:\\s*(.+?)\\s*$`, 'im');
  const match = String(content || '').match(pattern);
  return match ? match[1].trim() : '';
}

function sectionAfterHeading(content, heading) {
  return extractMarkdownSection(content, heading, { exactMatch: true });
}

function detailSections(content) {
  const lines = String(content || '')
    .replace(/\r/g, '')
    .split('\n');
  const sections = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^##\s+File:\s+(.+?)\s*$/i);
    if (!match) continue;
    const body = [];
    for (const line of lines.slice(index + 1)) {
      if (line.startsWith('## ')) break;
      body.push(line);
    }
    sections.push({ file: match[1].trim().replaceAll('\\', '/'), content: body.join('\n') });
  }
  return sections;
}

function parseTableSection(content, label, requiredColumns) {
  const parsed = parseMarkdownTable(content, { label, requiredColumns });
  return {
    errors: parsed.errors,
    rows: parsed.rows,
    header: parsed.header
  };
}

function normalizeVerdict(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'pass' || normalized === 'passed') return 'pass';
  if (normalized === 'fail' || normalized === 'failed') return 'fail';
  return normalized;
}

function cell(row, name) {
  return String(row.values[normalizeColumn(name)] || '').trim();
}

function traceMatchesRf(file, content, rf) {
  if (!rf) return true;
  const needle = String(rf).trim().toUpperCase();
  if (!needle) return true;
  return `${path.basename(file)}\n${content}`.toUpperCase().includes(needle);
}

async function activeRunRf(cwd) {
  const activeRunId = await getActiveRunId(cwd);
  if (!activeRunId) return '';
  try {
    const snapshot = await readRunSnapshot(cwd, activeRunId);
    return snapshot.rfId || '';
  } catch {
    return '';
  }
}

async function featureRecords(cwd, featureRoot, rf) {
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const records = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    if (!traceMatchesRf(file, content, rf)) continue;
    records.push({
      file,
      relative: relativeTo(cwd, file),
      content,
      sha256: await hashFile(file)
    });
  }
  return records;
}

export async function validateQualityReport(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const mode = normalizeAdvisoryMode(options.mode || getConfigValue(config, 'testDesign.quality.mode', 'off'));
  const minDimensionsPassed = Number(
    options.minDimensionsPassed ?? getConfigValue(config, 'testDesign.quality.minDimensionsPassed', 7)
  );
  const reportPath = options.reportPath || getConfigValue(config, 'testDesign.quality.reportPath', DEFAULT_REPORT_PATH);
  const featureRoot = options.featureRoot || getConfigValue(config, 'gherkin.featurePath', 'features');
  const rf = String(options.rf ?? (await activeRunRf(cwd)) ?? '').trim();
  const rubricPath = options.rubricPath || DEFAULT_RUBRIC_PATH;
  const findings = [];

  const reportAbsolute = resolveRepoPath(cwd, reportPath, { label: 'quality report' });
  if (!(await pathExists(reportAbsolute))) {
    const result = {
      ok: Boolean(options.allowMissing || mode === 'off'),
      mode,
      skipped: Boolean(options.allowMissing || mode === 'off'),
      reportPath,
      featureRoot,
      rf,
      findings: [],
      errors: [],
      warnings: [],
      message: `Gherkin quality report not found: ${reportPath}`
    };
    if (!result.ok) {
      addFinding(result.findings, 'error', result.message, { path: reportPath });
      result.errors = result.findings;
    }
    return result;
  }

  const rubricContent = await readText(resolveRepoPath(cwd, rubricPath, { label: 'quality rubric' }));
  const rubricVersion = parseRubricVersion(rubricContent);
  const dimensions = parseRubricDimensions(rubricContent);
  const reportContent = await readText(reportAbsolute);
  const reportedVersion = Number(parseHeaderValue(reportContent, 'Rubric Version'));

  if (!rubricVersion) {
    addFinding(findings, 'error', `Rubric version is missing from ${rubricPath}.`, { path: rubricPath });
  } else if (reportedVersion !== rubricVersion) {
    addFinding(
      findings,
      'error',
      `Report rubric version ${reportedVersion || '<missing>'} does not match shipped rubric version ${rubricVersion}.`,
      { path: reportPath }
    );
  }

  const features = await featureRecords(cwd, featureRoot, rf);
  if (features.length === 0) {
    const severity = options.allowEmpty ? 'warning' : 'error';
    addFinding(findings, severity, `No .feature files found under ${featureRoot}${rf ? ` for ${rf}` : ''}.`);
  }

  const evaluatedTable = parseTableSection(
    sectionAfterHeading(reportContent, '## Evaluated Files'),
    'Evaluated Files',
    ['File', 'Content hash']
  );
  for (const error of evaluatedTable.errors) addFinding(findings, 'error', error, { path: reportPath });

  const evaluatedByFile = new Map();
  for (const row of evaluatedTable.rows) {
    const file = cell(row, 'File').replaceAll('\\', '/');
    const contentHash = cell(row, 'Content hash');
    if (!file || !contentHash) {
      addFinding(findings, 'error', `Line ${row.line}: evaluated file rows need File and Content hash.`, {
        path: reportPath,
        line: row.line
      });
      continue;
    }
    evaluatedByFile.set(file, { hash: contentHash, line: row.line });
  }

  for (const feature of features) {
    const listed = evaluatedByFile.get(feature.relative);
    if (!listed) {
      addFinding(findings, 'error', `${feature.relative} is missing from the Evaluated Files table.`, {
        file: feature.relative
      });
    } else if (listed.hash !== feature.sha256) {
      addFinding(findings, 'error', `${feature.relative} has a stale content hash in the quality report.`, {
        file: feature.relative,
        expectedHash: feature.sha256,
        actualHash: listed.hash
      });
    }
  }

  for (const [file] of evaluatedByFile.entries()) {
    if (!features.some((feature) => feature.relative === file)) {
      addFinding(findings, 'error', `${file} is listed in the report but is not an evaluated feature file.`, {
        file
      });
    }
  }

  const detailsByFile = new Map();
  for (const section of detailSections(reportContent)) {
    const table = parseTableSection(section.content, `Quality detail table for ${section.file}`, [
      'Dimension',
      'Criterion',
      'Verdict (pass/fail)',
      'Evidence (quoted line)'
    ]);
    for (const error of table.errors) addFinding(findings, 'error', error, { path: reportPath, file: section.file });

    const rows = [];
    for (const row of table.rows) {
      const dimension = cell(row, 'Dimension');
      const criterion = cell(row, 'Criterion');
      const verdict = normalizeVerdict(cell(row, 'Verdict (pass/fail)'));
      const evidence = cell(row, 'Evidence (quoted line)');
      if (!dimensions.includes(dimension)) {
        addFinding(findings, 'error', `Line ${row.line}: unknown or missing quality dimension "${dimension}".`, {
          path: reportPath,
          line: row.line,
          file: section.file
        });
      }
      if (!criterion) {
        addFinding(findings, 'error', `Line ${row.line}: criterion is required.`, {
          path: reportPath,
          line: row.line,
          file: section.file
        });
      }
      if (verdict !== 'pass' && verdict !== 'fail') {
        addFinding(findings, 'error', `Line ${row.line}: verdict must be pass or fail.`, {
          path: reportPath,
          line: row.line,
          file: section.file
        });
      }
      if (!evidence) {
        addFinding(findings, 'error', `Line ${row.line}: evidence is required.`, {
          path: reportPath,
          line: row.line,
          file: section.file
        });
      }
      rows.push({ dimension, criterion, verdict, evidence, line: row.line });
    }
    detailsByFile.set(section.file, rows);
  }

  const summaryTable = parseTableSection(sectionAfterHeading(reportContent, '## Summary'), 'Quality summary', [
    'File',
    'Dimensions passed',
    'Verdict'
  ]);
  for (const error of summaryTable.errors) addFinding(findings, 'error', error, { path: reportPath });

  const summaryByFile = new Map();
  for (const row of summaryTable.rows) {
    summaryByFile.set(cell(row, 'File').replaceAll('\\', '/'), {
      dimensionsPassed: Number(cell(row, 'Dimensions passed')),
      verdict: normalizeVerdict(cell(row, 'Verdict')),
      line: row.line
    });
  }

  for (const feature of features) {
    const rows = detailsByFile.get(feature.relative);
    if (!rows) {
      addFinding(findings, 'error', `${feature.relative} is missing a detail table section.`, {
        file: feature.relative
      });
      continue;
    }

    for (const dimension of dimensions) {
      if (!rows.some((row) => row.dimension === dimension)) {
        addFinding(findings, 'error', `${feature.relative} is missing dimension ${dimension}.`, {
          file: feature.relative,
          dimension
        });
      }
    }

    const passedDimensions = dimensions.filter((dimension) => {
      const dimensionRows = rows.filter((row) => row.dimension === dimension);
      return dimensionRows.length > 0 && dimensionRows.every((row) => row.verdict === 'pass');
    });
    const failedDimensions = dimensions.filter((dimension) => !passedDimensions.includes(dimension));
    const actualCount = passedDimensions.length;
    const expectedVerdict = actualCount >= minDimensionsPassed ? 'pass' : 'fail';
    const summary = summaryByFile.get(feature.relative);

    if (!summary) {
      addFinding(findings, 'error', `${feature.relative} is missing from the Summary table.`, {
        file: feature.relative
      });
    } else {
      if (summary.dimensionsPassed !== actualCount) {
        addFinding(
          findings,
          'error',
          `${feature.relative} summary says ${summary.dimensionsPassed} dimensions passed, expected ${actualCount}.`,
          { file: feature.relative, line: summary.line }
        );
      }
      if (summary.verdict !== expectedVerdict) {
        addFinding(findings, 'error', `${feature.relative} summary verdict must be ${expectedVerdict}.`, {
          file: feature.relative,
          line: summary.line
        });
      }
    }

    if (actualCount < minDimensionsPassed) {
      addFinding(
        findings,
        isBlockingAdvisoryMode(mode) ? 'error' : 'warning',
        `${feature.relative} passes ${actualCount}/${dimensions.length} quality dimensions; threshold is ${minDimensionsPassed}.`,
        { file: feature.relative, failedDimensions }
      );
    }
  }

  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  return {
    ok: errors.length === 0,
    mode,
    skipped: false,
    rubricVersion,
    reportPath,
    featureRoot,
    rf,
    minDimensionsPassed,
    evaluatedFiles: features.map((feature) => ({ file: feature.relative, sha256: feature.sha256 })),
    dimensions,
    findings,
    errors,
    warnings
  };
}
