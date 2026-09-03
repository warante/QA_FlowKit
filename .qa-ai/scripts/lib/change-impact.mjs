import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { parseMarkdownTable, normalizeColumn } from './markdown-table.mjs';
import { functionalMatrixContent } from './markdown-section.mjs';
import { getConfigValue, loadQaAiConfig, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';
import { normalizeId } from './gherkin-validate.mjs';

const REQUIRED_COLUMNS = ['RF', 'Feature File', 'Test Management Case ID', 'Automation Status'];

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

    if (!rf) continue;

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

export function parseGitDiff(diffOutput) {
  const changedFiles = [];
  const lines = diffOutput.split('\n');

  let currentFile = null;
  let fileType = 'unknown';

  for (const line of lines) {
    const diffMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (diffMatch) {
      if (currentFile) {
        changedFiles.push({ path: currentFile, type: fileType });
      }
      currentFile = diffMatch[2];
      fileType = classifyFile(diffMatch[2]);
      continue;
    }
  }

  if (currentFile) {
    changedFiles.push({ path: currentFile, type: fileType });
  }

  return changedFiles;
}

function classifyFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

  if (
    normalizedPath.includes('/test/') ||
    normalizedPath.includes('/tests/') ||
    normalizedPath.includes('/spec/') ||
    normalizedPath.includes('/specs/') ||
    normalizedPath.includes('__tests__') ||
    ext === '.feature' ||
    normalizedPath.includes('.spec.') ||
    normalizedPath.includes('.test.')
  ) {
    return 'test';
  }

  if (
    ext === '.js' ||
    ext === '.ts' ||
    ext === '.jsx' ||
    ext === '.tsx' ||
    ext === '.py' ||
    ext === '.java' ||
    ext === '.go' ||
    ext === '.rb' ||
    ext === '.cs' ||
    ext === '.php'
  ) {
    return 'source';
  }

  if (ext === '.json' || ext === '.yaml' || ext === '.yml' || ext === '.toml' || ext === '.ini' || ext === '.config') {
    return 'config';
  }

  if (ext === '.md' || ext === '.txt' || ext === '.rst') {
    return 'doc';
  }

  return 'other';
}

export function getGitDiff(cwd, options = {}) {
  const { branch = 'main', commit = null } = options;

  let args;
  if (commit) {
    args = ['diff', '--name-status', commit];
  } else {
    args = ['diff', '--name-status', branch];
  }

  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 30000
  });

  if (result.error) {
    return { changedFiles: [], errors: [`Git diff failed: ${result.error.message}`] };
  }

  if (result.status !== 0) {
    return { changedFiles: [], errors: [`Git diff failed with status ${result.status}: ${result.stderr}`] };
  }

  const changedFiles = [];
  const lines = result.stdout.trim().split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const status = parts[0];
      const filePath = parts[parts.length - 1];
      const fileType = classifyFile(filePath);
      changedFiles.push({ path: filePath, type: fileType, status });
    }
  }

  return { changedFiles, errors: [] };
}

export function mapChangesToRfs(changedFiles, matrixRows) {
  const affectedRfs = new Map();
  const affectedTests = new Set();

  const featureToRfs = new Map();
  for (const row of matrixRows) {
    if (row.featureFile) {
      const normalized = row.featureFile.replace(/\\/g, '/').toLowerCase();
      if (!featureToRfs.has(normalized)) {
        featureToRfs.set(normalized, []);
      }
      featureToRfs.get(normalized).push(row.rfId);
    }
  }

  for (const file of changedFiles) {
    const normalizedPath = file.path.replace(/\\/g, '/').toLowerCase();
    const fileName = path.basename(normalizedPath, path.extname(normalizedPath)).toLowerCase();

    if (file.type === 'test') {
      affectedTests.add(file.path);

      for (const [featurePath, rfs] of featureToRfs.entries()) {
        const featureName = path.basename(featurePath, '.feature').toLowerCase();
        if (
          normalizedPath.includes(featurePath) ||
          featurePath.includes(normalizedPath) ||
          fileName.includes(featureName) ||
          featureName.includes(fileName)
        ) {
          for (const rfId of rfs) {
            if (!affectedRfs.has(rfId)) {
              affectedRfs.set(rfId, {
                rfId,
                affectedBy: 'test-change',
                riskLevel: 'medium',
                recommendedTests: new Set(),
                changedFiles: []
              });
            }
            const rf = affectedRfs.get(rfId);
            rf.changedFiles.push(file.path);
            for (const row of matrixRows) {
              if (row.rfId === rfId && row.caseId) {
                rf.recommendedTests.add(row.caseId);
              }
            }
          }
        }
      }
    } else if (file.type === 'source') {
      for (const [featurePath, rfs] of featureToRfs.entries()) {
        const featureDir = path.dirname(featurePath);
        const sourceDir = path.dirname(normalizedPath);
        const featureName = path.basename(featurePath, '.feature').toLowerCase();
        if (
          sourceDir === featureDir ||
          normalizedPath.startsWith(featureDir) ||
          fileName.includes(featureName) ||
          featureName.includes(fileName)
        ) {
          for (const rfId of rfs) {
            if (!affectedRfs.has(rfId)) {
              affectedRfs.set(rfId, {
                rfId,
                affectedBy: 'code-change',
                riskLevel: 'high',
                recommendedTests: new Set(),
                changedFiles: []
              });
            }
            const rf = affectedRfs.get(rfId);
            rf.changedFiles.push(file.path);
            if (rf.affectedBy === 'test-change') {
              rf.affectedBy = 'both';
            }
            for (const row of matrixRows) {
              if (row.rfId === rfId && row.caseId) {
                rf.recommendedTests.add(row.caseId);
              }
            }
          }
        }
      }
    }
  }

  const rfDetails = Array.from(affectedRfs.values()).map((rf) => ({
    ...rf,
    recommendedTests: Array.from(rf.recommendedTests)
  }));

  return {
    affectedRfs: rfDetails,
    affectedTests: Array.from(affectedTests),
    changedFiles: changedFiles.map((f) => f.path)
  };
}

export function computeChangeImpactMetrics(changedFiles, matrixRows) {
  const { affectedRfs, affectedTests } = mapChangesToRfs(changedFiles, matrixRows);

  const sourceFiles = changedFiles.filter((f) => f.type === 'source');
  const testFiles = changedFiles.filter((f) => f.type === 'test');

  const highRisk = affectedRfs.filter((rf) => rf.riskLevel === 'high');
  const mediumRisk = affectedRfs.filter((rf) => rf.riskLevel === 'medium');

  return {
    summary: {
      changedFiles: changedFiles.length,
      testFilesChanged: testFiles.length,
      sourceFilesChanged: sourceFiles.length,
      affectedRfs: affectedRfs.length,
      recommendedTests: affectedRfs.reduce((sum, rf) => sum + rf.recommendedTests.length, 0),
      highRiskRfs: highRisk.length,
      mediumRiskRfs: mediumRisk.length
    },
    affectedRfs,
    affectedTests,
    changedFiles: changedFiles.map((f) => ({ path: f.path, type: f.type }))
  };
}

export function formatChangeImpactReport(metrics) {
  const s = metrics.summary;
  const lines = [];

  lines.push('# Change Impact Analysis');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| ------ | ----- |');
  lines.push(`| Files Changed | ${s.changedFiles} |`);
  lines.push(`| Test Files Changed | ${s.testFilesChanged} |`);
  lines.push(`| Source Files Changed | ${s.sourceFilesChanged} |`);
  lines.push(`| Affected RFs | ${s.affectedRfs} |`);
  lines.push(`| Recommended Tests to Run | ${s.recommendedTests} |`);

  if (metrics.affectedRfs.length > 0) {
    lines.push('');
    lines.push('## Affected Requirements');
    lines.push('');
    lines.push('| RF ID | Affected By | Risk | Recommended Tests |');
    lines.push('| ----- | ----------- | ---- | ----------------- |');
    for (const rf of metrics.affectedRfs) {
      const tests = rf.recommendedTests.slice(0, 3).join(', ');
      const more = rf.recommendedTests.length > 3 ? ` +${rf.recommendedTests.length - 3} more` : '';
      lines.push(`| ${rf.rfId} | ${rf.affectedBy} | ${rf.riskLevel} | ${tests}${more} |`);
    }
  }

  if (metrics.changedFiles.length > 0) {
    lines.push('');
    lines.push('## Files Changed');
    lines.push('');
    lines.push('| File | Type |');
    lines.push('| ---- | ---- |');
    for (const file of metrics.changedFiles) {
      lines.push(`| ${file.path} | ${file.type} |`);
    }
  }

  return lines.join('\n');
}

export async function computeChangeImpact(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};

  const matrixPath =
    options.matrixPath || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
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

  let changedFiles;
  let diffErrors = [];

  if (options.diffInput) {
    changedFiles = parseGitDiff(options.diffInput);
  } else {
    const diffResult = getGitDiff(cwd, options);
    changedFiles = diffResult.changedFiles;
    diffErrors = diffResult.errors;
  }

  if (diffErrors.length > 0 && changedFiles.length === 0) {
    return {
      ok: false,
      errors: diffErrors,
      warnings: [],
      metrics: null
    };
  }

  const metrics = computeChangeImpactMetrics(changedFiles, matrixRows);

  return {
    ok: true,
    errors: [],
    warnings: diffErrors,
    metrics
  };
}
