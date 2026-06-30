#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateTestImpact } from './_fixtures.mjs';

async function setupTestImpactFixture({ matrixContent = '', reportContent = '' } = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-impact-'));
  await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });

  const yamlContent = [
    'project:',
    '  qaTrack: standard',
    'traceability:',
    '  matrixPath: qa-ai-output/traceability-matrix.md',
    'testImpact:',
    '  analysisPath: qa-ai-output/test-impact-analysis.md',
    ''
  ].join('\n');

  await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), yamlContent, 'utf8');

  const defaultMatrix =
    matrixContent ||
    `
# Traceability Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/login.md | RF-101 | CA-1 | features/login.feature | TC-101 | e2e | high | automated | tests/login.spec.js |
| reqs/login.md | RF-101 | CA-2 | features/login.feature | TC-102 | e2e | high | automated | tests/login.spec.js |
| reqs/logout.md | RF-102 | CA-1 | features/logout.feature | TC-103 | e2e | high | automated | tests/logout.spec.js |
`;
  await fs.writeFile(path.join(tmp, 'qa-ai-output/traceability-matrix.md'), defaultMatrix, 'utf8');

  if (reportContent) {
    await fs.writeFile(path.join(tmp, 'qa-ai-output/test-impact-analysis.md'), reportContent, 'utf8');
  }

  return tmp;
}

test('validateTestImpact: succeeds on complete valid impact report', async () => {
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101, TC-102 | Changed login page components |
| Account | RF-102 | TC-103 | Logout flow changed |

## Selected Test IDs

- TC-101
- TC-102
- TC-103
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails if report is missing and allowMissing is false', async () => {
  const tmp = await setupTestImpactFixture();
  try {
    const result = await validateTestImpact(tmp, { allowMissing: false });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Test impact analysis report file not found')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: succeeds if report is missing and allowMissing is true', async () => {
  const tmp = await setupTestImpactFixture();
  try {
    const result = await validateTestImpact(tmp, { allowMissing: true });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on unknown test ID', async () => {
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101, TC-999 | Changed login page components |

## Selected Test IDs

- TC-101
- TC-999
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Test ID "TC-999" is not registered')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on unknown RF', async () => {
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-999 | TC-101 | Changed login page components |

## Selected Test IDs

- TC-101
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('RF "RF-999" is not registered')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on selected list mismatch (silent additions / removals)', async () => {
  // Silent removal: TC-102 is in the table but missing from Selected Test IDs list
  const reportContent1 = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101, TC-102 | Changed login page components |

## Selected Test IDs

- TC-101
`;
  const tmp1 = await setupTestImpactFixture({ reportContent: reportContent1 });
  try {
    const result = await validateTestImpact(tmp1);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('missing from the Selected Test IDs list')));
  } finally {
    await fs.rm(tmp1, { recursive: true, force: true });
  }

  // Silent addition: TC-103 is in Selected Test IDs list but not in Impacted Areas table
  const reportContent2 = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101 | Changed login page components |

## Selected Test IDs

- TC-101
- TC-103
`;
  const tmp2 = await setupTestImpactFixture({ reportContent: reportContent2 });
  try {
    const result = await validateTestImpact(tmp2);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('not in the Impacted Areas table')));
  } finally {
    await fs.rm(tmp2, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on missing matrix test for an affected RF (Superset Rule violation)', async () => {
  // RF-101 is affected, which has TC-101 and TC-102 in the matrix.
  // But we only included TC-101 in the table and Selected Test IDs.
  // This satisfies the Union Check, but violates the Superset Rule!
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101 | Changed login page components |

## Selected Test IDs

- TC-101
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Superset Rule')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
