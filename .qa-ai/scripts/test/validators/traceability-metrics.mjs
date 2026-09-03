#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTraceabilityMetrics, formatMetricsReport } from './_fixtures.mjs';

const EMPTY_MATRIX = `# Traceability Matrix

| Requirement Source | RF | CA | Criterion IDs | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| ------------------ | -- | -- | ------------- | ------------ | ----------------------- | ---- | -------- | ----------------- | --------------- |

## Non-functional traceability

| Requirement source | RF | NFR ID | Attribute | Evidence type | Evidence reference | Status | Residual risk |
| ------------------ | -- | ------ | --------- | ------------- | ------------------ | ------ | ------------- |
`;

const COMPLETE_MATRIX = `# Traceability Matrix

| Requirement Source | RF | CA | Criterion IDs | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| ------------------ | -- | -- | ------------- | ------------ | ----------------------- | ---- | -------- | ----------------- | --------------- |
| docs/prd.md | RF-042 | CA-001 | CRIT-001 | functional/RF-042-TC-001-login.feature | TC-001 | functional | high | automated | tests/login.spec.js |
| docs/prd.md | RF-042 | CA-002 | CRIT-002 | functional/RF-042-TC-002-logout.feature | TC-002 | functional | high | manual | - |
| docs/prd.md | RF-050 | CA-001 | CRIT-003 | api/RF-050-TC-003-timeout.feature | TC-003 | api | medium | proposal-only | - |

## Non-functional traceability

| Requirement source | RF | NFR ID | Attribute | Evidence type | Evidence reference | Status | Residual risk |
| ------------------ | --- | ------ | --------- | ------------- | ------------------ | ------ | ------------- |
| docs/prd.md | RF-042 | NFR-001 | security | feature | functional/RF-042-TC-001-login.feature | covered | - |
| docs/prd.md | RF-042 | NFR-002 | performance | test-plan | test-design-proposal.md | planned | - |
| docs/prd.md | RF-050 | NFR-003 | availability | residual-risk | - | residual-risk | Service may timeout under load |
`;

const PARTIAL_MATRIX = `# Traceability Matrix

| Requirement Source | RF | CA | Criterion IDs | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| ------------------ | -- | -- | ------------- | ------------ | ----------------------- | ---- | -------- | ----------------- | --------------- |
| docs/prd.md | RF-042 | CA-001 | CRIT-001 | functional/RF-042-TC-001-login.feature | TC-001 | functional | high | automated | tests/login.spec.js |
| docs/prd.md | | | | | | functional | low | manual | - |

## Non-functional traceability

| Requirement source | RF | NFR ID | Attribute | Evidence type | Evidence reference | Status | Residual risk |
| ------------------ | --- | ------ | --------- | ------------- | ------------------ | ------ | ------------- |
| docs/prd.md | RF-042 | NFR-001 | security | | | planned | - |
`;

const NFR_ONLY_MATRIX = `# Traceability Matrix

| Requirement Source | RF | CA | Criterion IDs | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| ------------------ | -- | -- | ------------- | ------------ | ----------------------- | ---- | -------- | ----------------- | --------------- |

## Non-functional traceability

| Requirement source | RF | NFR ID | Attribute | Evidence type | Evidence reference | Status | Residual risk |
| ------------------ | --- | ------ | --------- | ------------- | ------------------ | ------ | ------------- |
| docs/prd.md | RF-042 | NFR-001 | security | feature | functional/RF-042-TC-001.feature | covered | - |
| docs/prd.md | RF-042 | NFR-002 | performance | test-plan | test-design-proposal.md | planned | - |
| docs/prd.md | RF-050 | NFR-003 | availability | residual-risk | - | residual-risk | High latency under load |
| docs/prd.md | RF-050 | NFR-004 | scalability | - | - | blocked | Cannot test without prod-like env |
`;

test('traceability-metrics: empty matrix returns zero counts', () => {
  const metrics = computeTraceabilityMetrics(EMPTY_MATRIX);

  assert.equal(metrics.summary.totalRFs, 0);
  assert.equal(metrics.summary.coveredRFs, 0);
  assert.equal(metrics.summary.uncoveredRFs, 0);
  assert.equal(metrics.summary.rfCoveragePercent, 0);
  assert.equal(metrics.summary.totalNFRs, 0);
  assert.equal(metrics.summary.nfrsWithEvidence, 0);
  assert.equal(metrics.summary.nfrCoveragePercent, 0);
  assert.equal(metrics.summary.totalTests, 0);
  assert.equal(metrics.summary.automatedTests, 0);
  assert.equal(metrics.summary.manualTests, 0);
  assert.equal(metrics.summary.proposalOnlyTests, 0);
  assert.equal(metrics.summary.automationPercent, 0);
  assert.equal(metrics.summary.completeTraceability, 0);
  assert.equal(metrics.summary.partialTraceability, 0);
  assert.equal(metrics.summary.missingTraceability, 0);
  assert.equal(metrics.functionalRowCount, 0);
  assert.equal(metrics.nfrRowCount, 0);
});

test('traceability-metrics: complete matrix calculates correct coverage', () => {
  const metrics = computeTraceabilityMetrics(COMPLETE_MATRIX);

  assert.equal(metrics.summary.totalRFs, 2);
  assert.equal(metrics.summary.coveredRFs, 2);
  assert.equal(metrics.summary.uncoveredRFs, 0);
  assert.equal(metrics.summary.rfCoveragePercent, 100);

  assert.equal(metrics.summary.totalNFRs, 3);
  assert.equal(metrics.summary.nfrsWithEvidence, 3);
  assert.equal(metrics.summary.nfrCoveragePercent, 100);

  assert.equal(metrics.summary.totalTests, 3);
  assert.equal(metrics.summary.automatedTests, 1);
  assert.equal(metrics.summary.manualTests, 1);
  assert.equal(metrics.summary.proposalOnlyTests, 1);
  assert.equal(metrics.summary.automationPercent, 33);

  assert.equal(metrics.summary.completeTraceability, 3);
  assert.equal(metrics.summary.partialTraceability, 0);
  assert.equal(metrics.summary.missingTraceability, 0);
  assert.equal(metrics.summary.completeTraceabilityPercent, 100);
});

test('traceability-metrics: partial matrix detects missing traceability', () => {
  const metrics = computeTraceabilityMetrics(PARTIAL_MATRIX);

  assert.equal(metrics.summary.totalRFs, 1);
  assert.equal(metrics.summary.coveredRFs, 1);
  assert.equal(metrics.summary.totalTests, 2);
  assert.equal(metrics.summary.completeTraceability, 1);
  assert.equal(metrics.summary.partialTraceability, 0);
  assert.equal(metrics.summary.missingTraceability, 1);

  assert.equal(metrics.summary.totalNFRs, 1);
  assert.equal(metrics.summary.nfrsWithEvidence, 0);
  assert.equal(metrics.summary.nfrCoveragePercent, 0);
});

test('traceability-metrics: NFR-only matrix calculates NFR metrics correctly', () => {
  const metrics = computeTraceabilityMetrics(NFR_ONLY_MATRIX);

  assert.equal(metrics.summary.totalRFs, 0);
  assert.equal(metrics.summary.totalNFRs, 4);
  assert.equal(metrics.summary.nfrsWithEvidence, 3);
  assert.equal(metrics.summary.nfrCoveragePercent, 75);

  assert.equal(metrics.nfrByAttribute.security.total, 1);
  assert.equal(metrics.nfrByAttribute.security.covered, 1);
  assert.equal(metrics.nfrByAttribute.performance.total, 1);
  assert.equal(metrics.nfrByAttribute.performance.planned, 1);
  assert.equal(metrics.nfrByAttribute.availability.total, 1);
  assert.equal(metrics.nfrByAttribute.availability.residualRisk, 1);
  assert.equal(metrics.nfrByAttribute.scalability.total, 1);
  assert.equal(metrics.nfrByAttribute.scalability.blocked, 1);
});

test('traceability-metrics: uncovered RFs are listed', () => {
  const matrixWithUncovered = `# Traceability Matrix

| Requirement Source | RF | CA | Criterion IDs | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| ------------------ | -- | -- | ------------- | ------------ | ----------------------- | ---- | -------- | ----------------- | --------------- |
| docs/prd.md | RF-042 | CA-001 | CRIT-001 | functional/RF-042-TC-001.feature | TC-001 | functional | high | automated | tests/login.spec.js |
| docs/prd.md | RF-050 | CA-001 | | | | functional | medium | proposal-only | - |

## Non-functional traceability

| Requirement source | RF | NFR ID | Attribute | Evidence type | Evidence reference | Status | Residual risk |
| ------------------ | --- | ------ | --------- | ------------- | ------------------ | ------ | ------------- |
`;

  const metrics = computeTraceabilityMetrics(matrixWithUncovered);

  assert.equal(metrics.summary.totalRFs, 2);
  assert.equal(metrics.summary.coveredRFs, 1);
  assert.equal(metrics.summary.uncoveredRFs, 1);
  assert.deepEqual(metrics.uncoveredRFList, ['RF-050']);
});

test('traceability-metrics: formatMetricsReport generates valid markdown', () => {
  const metrics = computeTraceabilityMetrics(COMPLETE_MATRIX);
  const report = formatMetricsReport(metrics);

  assert.ok(report.includes('# Traceability Metrics Report'));
  assert.ok(report.includes('## Coverage Summary'));
  assert.ok(report.includes('RF Coverage'));
  assert.ok(report.includes('NFR Coverage'));
  assert.ok(report.includes('Automation Rate'));
  assert.ok(report.includes('Complete Traceability'));
  assert.ok(report.includes('## Detailed Breakdown'));
  assert.ok(report.includes('### Functional Coverage'));
  assert.ok(report.includes('### NFR Coverage by Attribute'));
  assert.ok(report.includes('### Automation Status'));
  assert.ok(report.includes('### Traceability Completeness'));
  assert.ok(report.includes('Total RFs: 2'));
  assert.ok(report.includes('Covered RFs: 2'));
  assert.ok(report.includes('Automated: 1 tests'));
  assert.ok(report.includes('Manual: 1 tests'));
  assert.ok(report.includes('Proposal-only: 1 tests'));
});

test('traceability-metrics: formatMetricsReport handles empty metrics', () => {
  const metrics = computeTraceabilityMetrics(EMPTY_MATRIX);
  const report = formatMetricsReport(metrics);

  assert.ok(report.includes('# Traceability Metrics Report'));
  assert.ok(report.includes('Total RFs: 0'));
  assert.ok(report.includes('Uncovered RFs: none'));
  assert.ok(report.includes('Automated: 0 tests'));
});

test('traceability-metrics: status icons are correct', () => {
  const metrics = computeTraceabilityMetrics(COMPLETE_MATRIX);
  const report = formatMetricsReport(metrics);

  assert.ok(report.includes('| RF Coverage | 2/2 (100%) | PASS |'));
  assert.ok(report.includes('| NFR Coverage | 3/3 (100%) | PASS |'));
  assert.ok(report.includes('| Automation Rate | 1/3 (33%) | FAIL |'));
  assert.ok(report.includes('| Complete Traceability | 3/3 (100%) | PASS |'));
});

test('traceability-metrics: multiple RF IDs in single row are counted', () => {
  const matrixWithMultipleRFs = `# Traceability Matrix

| Requirement Source | RF | CA | Criterion IDs | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| ------------------ | -- | -- | ------------- | ------------ | ----------------------- | ---- | -------- | ----------------- | --------------- |
| docs/prd.md | RF-042, RF-050 | CA-001 | CRIT-001 | functional/RF-042-RF-050-TC-001.feature | TC-001 | functional | high | automated | tests/shared.spec.js |

## Non-functional traceability

| Requirement source | RF | NFR ID | Attribute | Evidence type | Evidence reference | Status | Residual risk |
| ------------------ | --- | ------ | --------- | ------------- | ------------------ | ------ | ------------- |
`;

  const metrics = computeTraceabilityMetrics(matrixWithMultipleRFs);

  assert.equal(metrics.summary.totalRFs, 2);
  assert.equal(metrics.summary.coveredRFs, 2);
  assert.equal(metrics.summary.uncoveredRFs, 0);
  assert.equal(metrics.summary.rfCoveragePercent, 100);
});
