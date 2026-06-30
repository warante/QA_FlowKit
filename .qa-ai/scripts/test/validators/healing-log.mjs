#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateHealingLog } from './_fixtures.mjs';

async function setupHealingFixture({ matrixContent = '', logContent = '', createSpecFile = true } = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-healing-'));
  await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });
  await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
  await fs.mkdir(path.join(tmp, 'tests'), { recursive: true });

  const yamlContent = [
    'project:',
    '  qaTrack: standard',
    'gherkin:',
    '  featurePath: features',
    'traceability:',
    '  matrixPath: qa-ai-output/traceability-matrix.md',
    'healing:',
    '  logPath: qa-ai-output/healing-log.md',
    'automation:',
    '  ui:',
    '    framework: playwright',
    '    specsPath: tests',
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
`;
  await fs.writeFile(path.join(tmp, 'qa-ai-output/traceability-matrix.md'), defaultMatrix, 'utf8');

  if (logContent) {
    await fs.writeFile(path.join(tmp, 'qa-ai-output/healing-log.md'), logContent, 'utf8');
  }

  if (createSpecFile) {
    await fs.writeFile(path.join(tmp, 'tests/login.spec.js'), '// mock spec\n', 'utf8');
  }

  return tmp;
}

test('validateHealingLog: accepts valid healing log', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | tests/login.spec.js | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: detects invalid Test ID', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-999 | tests/login.spec.js | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('not registered in the traceability matrix')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: detects invalid repair type', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | tests/login.spec.js | timeout | invalid-type | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Invalid repair type')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: checks justification length for other', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | tests/login.spec.js | timeout | other | short |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes('Justification for "other" repair type must be at least 20 characters'))
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: path safety checks (escaping spec path)', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | external.spec.js | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('is not within any configured automation spec directories')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: path safety checks (Gherkin feature file)', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | features/login.feature | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('never modify Gherkin design feature files')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
