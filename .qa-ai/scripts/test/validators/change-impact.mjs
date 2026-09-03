#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGitDiff, mapChangesToRfs, computeChangeImpactMetrics, formatChangeImpactReport } from './_fixtures.mjs';

const MATRIX_ROWS = [
  { rfId: 'RF-042', caseId: 'TC-001', featureFile: 'features/login.feature', automationStatus: 'automated', line: 2 },
  { rfId: 'RF-042', caseId: 'TC-002', featureFile: 'features/logout.feature', automationStatus: 'automated', line: 3 },
  { rfId: 'RF-050', caseId: 'TC-003', featureFile: 'features/api.feature', automationStatus: 'automated', line: 4 }
];

const SAMPLE_DIFF = `diff --git a/src/auth/login.js b/src/auth/login.js
index 1234567..abcdefg 100644
--- a/src/auth/login.js
+++ b/src/auth/login.js
@@ -1,5 +1,6 @@
diff --git a/tests/login.spec.js b/tests/login.spec.js
index 1234567..abcdefg 100644
--- a/tests/login.spec.js
+++ b/tests/login.spec.js
@@ -1,5 +1,6 @@
diff --git a/src/api/client.js b/src/api/client.js
index 1234567..abcdefg 100644
--- a/src/api/client.js
+++ b/src/api/client.js
@@ -1,5 +1,6 @@
`;

test('change-impact: parseGitDiff extracts changed files', () => {
  const changedFiles = parseGitDiff(SAMPLE_DIFF);

  assert.equal(changedFiles.length, 3);
  assert.equal(changedFiles[0].path, 'src/auth/login.js');
  assert.equal(changedFiles[0].type, 'source');
  assert.equal(changedFiles[1].path, 'tests/login.spec.js');
  assert.equal(changedFiles[1].type, 'test');
  assert.equal(changedFiles[2].path, 'src/api/client.js');
  assert.equal(changedFiles[2].type, 'source');
});

test('change-impact: parseGitDiff handles empty diff', () => {
  const changedFiles = parseGitDiff('');
  assert.equal(changedFiles.length, 0);
});

test('change-impact: mapChangesToRfs maps test changes to RFs', () => {
  const changedFiles = [{ path: 'tests/login.spec.js', type: 'test' }];

  const { affectedRfs, affectedTests } = mapChangesToRfs(changedFiles, MATRIX_ROWS);

  assert.equal(affectedTests.length, 1);
  assert.ok(affectedRfs.length > 0);
  assert.equal(affectedRfs[0].affectedBy, 'test-change');
});

test('change-impact: mapChangesToRfs maps source changes to RFs', () => {
  const changedFiles = [{ path: 'src/auth/login.js', type: 'source' }];

  const { affectedRfs, affectedTests } = mapChangesToRfs(changedFiles, MATRIX_ROWS);

  assert.equal(affectedTests.length, 0);
  assert.ok(affectedRfs.length > 0);
  assert.equal(affectedRfs[0].affectedBy, 'code-change');
  assert.equal(affectedRfs[0].riskLevel, 'high');
});

test('change-impact: computeChangeImpactMetrics calculates correct metrics', () => {
  const changedFiles = [
    { path: 'src/auth/login.js', type: 'source' },
    { path: 'tests/login.spec.js', type: 'test' },
    { path: 'src/api/client.js', type: 'source' }
  ];

  const metrics = computeChangeImpactMetrics(changedFiles, MATRIX_ROWS);

  assert.equal(metrics.summary.changedFiles, 3);
  assert.equal(metrics.summary.testFilesChanged, 1);
  assert.equal(metrics.summary.sourceFilesChanged, 2);
  assert.ok(metrics.summary.affectedRfs > 0);
  assert.ok(metrics.summary.recommendedTests > 0);
});

test('change-impact: computeChangeImpactMetrics handles no changes', () => {
  const metrics = computeChangeImpactMetrics([], MATRIX_ROWS);

  assert.equal(metrics.summary.changedFiles, 0);
  assert.equal(metrics.summary.affectedRfs, 0);
  assert.equal(metrics.summary.recommendedTests, 0);
});

test('change-impact: formatChangeImpactReport generates valid markdown', () => {
  const changedFiles = [
    { path: 'src/auth/login.js', type: 'source' },
    { path: 'tests/login.spec.js', type: 'test' }
  ];

  const metrics = computeChangeImpactMetrics(changedFiles, MATRIX_ROWS);
  const report = formatChangeImpactReport(metrics);

  assert.ok(report.includes('# Change Impact Analysis'));
  assert.ok(report.includes('## Summary'));
  assert.ok(report.includes('Files Changed | 2'));
  assert.ok(report.includes('Test Files Changed | 1'));
  assert.ok(report.includes('Source Files Changed | 1'));
  assert.ok(report.includes('## Affected Requirements'));
  assert.ok(report.includes('## Files Changed'));
});

test('change-impact: formatChangeImpactReport handles empty metrics', () => {
  const metrics = computeChangeImpactMetrics([], []);
  const report = formatChangeImpactReport(metrics);

  assert.ok(report.includes('# Change Impact Analysis'));
  assert.ok(report.includes('Files Changed | 0'));
  assert.ok(!report.includes('## Affected Requirements'));
});
