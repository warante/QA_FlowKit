#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  linkExecutionToTraceability,
  computeExecutionTraceabilityMetrics,
  formatExecutionTraceabilityReport
} from './_fixtures.mjs';

const MATRIX_ROWS = [
  { rfId: 'RF-042', caseId: 'TC-001', featureFile: 'login.feature', automationStatus: 'automated', line: 2 },
  { rfId: 'RF-042', caseId: 'TC-002', featureFile: 'logout.feature', automationStatus: 'automated', line: 3 },
  { rfId: 'RF-050', caseId: 'TC-003', featureFile: 'api.feature', automationStatus: 'automated', line: 4 },
  { rfId: 'RF-060', caseId: 'TC-004', featureFile: 'checkout.feature', automationStatus: 'manual', line: 5 }
];

const EXECUTION_RESULTS = [
  { testId: 'TC-001', name: 'Login happy path', status: 'passed', durationMs: 150, message: '' },
  { testId: 'TC-002', name: 'Logout flow', status: 'passed', durationMs: 120, message: '' },
  { testId: 'TC-003', name: 'API timeout', status: 'failed', durationMs: 5000, message: 'Timeout exceeded' },
  { testId: 'TC-099', name: 'Unknown test', status: 'passed', durationMs: 50, message: '' }
];

test('execution-traceability: linkExecutionToTraceability links tests to RFs', () => {
  const { linkedResults, unlinkedTests, rfCoverage } = linkExecutionToTraceability(MATRIX_ROWS, EXECUTION_RESULTS);

  assert.equal(linkedResults.length, 3);
  assert.equal(unlinkedTests.length, 1);
  assert.equal(rfCoverage.length, 2);

  // Check linked results
  const tc001 = linkedResults.find((r) => r.testId === 'TC-001');
  assert.equal(tc001.rfId, 'RF-042');
  assert.equal(tc001.traceabilityComplete, true);

  // Check unlinked tests
  assert.equal(unlinkedTests[0].testId, 'TC-099');
  assert.equal(unlinkedTests[0].rfId, null);

  // Check RF coverage
  const rf042 = rfCoverage.find((r) => r.rfId === 'RF-042');
  assert.equal(rf042.totalTests, 2);
  assert.equal(rf042.passed, 2);
  assert.equal(rf042.failed, 0);

  const rf050 = rfCoverage.find((r) => r.rfId === 'RF-050');
  assert.equal(rf050.totalTests, 1);
  assert.equal(rf050.passed, 0);
  assert.equal(rf050.failed, 1);
});

test('execution-traceability: computeExecutionTraceabilityMetrics calculates correct metrics', () => {
  const metrics = computeExecutionTraceabilityMetrics(MATRIX_ROWS, EXECUTION_RESULTS);

  assert.equal(metrics.summary.totalTests, 4);
  assert.equal(metrics.summary.linkedToRf, 3);
  assert.equal(metrics.summary.unlinkedTests, 1);
  assert.equal(metrics.summary.linkedPercent, 75);

  assert.equal(metrics.summary.totalRfs, 3);
  assert.equal(metrics.summary.validatedRfs, 2);
  assert.equal(metrics.summary.notValidatedRfs, 1);
  assert.equal(metrics.summary.rfValidationPercent, 67);

  assert.deepEqual(metrics.notValidatedRfs, ['RF-060']);
});

test('execution-traceability: empty execution results return zero metrics', () => {
  const metrics = computeExecutionTraceabilityMetrics(MATRIX_ROWS, []);

  assert.equal(metrics.summary.totalTests, 0);
  assert.equal(metrics.summary.linkedToRf, 0);
  assert.equal(metrics.summary.unlinkedTests, 0);
  assert.equal(metrics.summary.linkedPercent, 0);
  assert.equal(metrics.summary.validatedRfs, 0);
  assert.equal(metrics.summary.rfValidationPercent, 0);
});

test('execution-traceability: empty matrix returns all tests unlinked', () => {
  const metrics = computeExecutionTraceabilityMetrics([], EXECUTION_RESULTS);

  assert.equal(metrics.summary.totalTests, 4);
  assert.equal(metrics.summary.linkedToRf, 0);
  assert.equal(metrics.summary.unlinkedTests, 4);
  assert.equal(metrics.summary.totalRfs, 0);
  assert.equal(metrics.summary.validatedRfs, 0);
});

test('execution-traceability: formatExecutionTraceabilityReport generates valid markdown', () => {
  const metrics = computeExecutionTraceabilityMetrics(MATRIX_ROWS, EXECUTION_RESULTS);
  const report = formatExecutionTraceabilityReport(metrics);

  assert.ok(report.includes('# Execution Traceability Report'));
  assert.ok(report.includes('## Summary'));
  assert.ok(report.includes('Total Tests Executed | 4'));
  assert.ok(report.includes('Linked to RF | 3 (75%)'));
  assert.ok(report.includes('## Unlinked Tests'));
  assert.ok(report.includes('TC-099'));
  assert.ok(report.includes('## RFs Not Validated'));
  assert.ok(report.includes('RF-060'));
  assert.ok(report.includes('## RF Coverage Details'));
  assert.ok(report.includes('RF-042'));
  assert.ok(report.includes('RF-050'));
});

test('execution-traceability: formatExecutionTraceabilityReport handles empty metrics', () => {
  const metrics = computeExecutionTraceabilityMetrics([], []);
  const report = formatExecutionTraceabilityReport(metrics);

  assert.ok(report.includes('# Execution Traceability Report'));
  assert.ok(report.includes('Total Tests Executed | 0'));
  assert.ok(!report.includes('## Unlinked Tests'));
  assert.ok(!report.includes('## RFs Not Validated'));
});

test('execution-traceability: multiple tests for same RF are aggregated', () => {
  const results = [
    { testId: 'TC-001', name: 'Test 1', status: 'passed', durationMs: 100, message: '' },
    { testId: 'TC-002', name: 'Test 2', status: 'failed', durationMs: 200, message: 'Error' },
    { testId: 'TC-003', name: 'Test 3', status: 'passed', durationMs: 150, message: '' }
  ];

  const metrics = computeExecutionTraceabilityMetrics(MATRIX_ROWS, results);

  const rf042 = metrics.rfCoverage.find((r) => r.rfId === 'RF-042');
  assert.equal(rf042.totalTests, 2);
  assert.equal(rf042.passed, 1);
  assert.equal(rf042.failed, 1);
});
