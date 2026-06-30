#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';

function asSpawnResult(result) {
  return { status: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

function runScript(scriptName, cwd, extraArgs = []) {
  return asSpawnResult(runValidatorScript(scriptName, cwd, extraArgs));
}

// --- validate-sync-diff ---

test('validate-sync-diff: accepts valid diff and snapshot', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-diff-'));
  try {
    const diffFile = path.join(tmp, 'diff.md');
    const snapshotFile = path.join(tmp, 'snapshot.md');
    const planFile = path.join(tmp, 'plan.md');
    const mappingFile = path.join(tmp, 'mapping.json');

    await fs.writeFile(
      snapshotFile,
      `# Snapshot
- Capture Timestamp: 2026-06-18T12:00:00Z

| External ID | Title | Section/Suite | Status | Hash |
| ----------- | ----- | ------------- | ------ | ---- |
| 12345       | TC1   | Suite1        | Active | h1   |
`,
      'utf8'
    );
    await fs.writeFile(
      diffFile,
      `# Diff

| ID | Action | External ID | Field changes | Idempotency key |
| --- | ------ | ----------- | ------------- | --------------- |
| TC-001 | create | | Title: TC1 | idemp-1 |
| TC-002 | update | 12345 | Title: TC2 | |
| TC-003 | skip | | | |
`,
      'utf8'
    );
    await fs.writeFile(
      planFile,
      `# Plan

| ID | Proposed action | Approval status |
| -- | --------------- | --------------- |
| TC-001 | Plan to create | Approved |
| TC-002 | Plan to update | Approved |
| TC-003 | Plan to skip | Approved |
`,
      'utf8'
    );
    await fs.writeFile(mappingFile, `{"TC-002": {"externalId": "12345"}}`, 'utf8');

    const res = runScript('validate-sync-diff.mjs', tmp, [
      '--diff-path',
      'diff.md',
      '--snapshot-path',
      'snapshot.md',
      '--plan-path',
      'plan.md',
      '--mapping-path',
      'mapping.json'
    ]);

    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-sync-diff: rejects invalid actions and IDs', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-diff-'));
  try {
    const diffFile = path.join(tmp, 'diff.md');
    const snapshotFile = path.join(tmp, 'snapshot.md');
    const planFile = path.join(tmp, 'plan.md');
    const mappingFile = path.join(tmp, 'mapping.json');

    await fs.writeFile(
      snapshotFile,
      `# Snapshot
- Capture Timestamp: 2026-06-18T12:00:00Z

| External ID | Title | Section/Suite | Status | Hash |
| ----------- | ----- | ------------- | ------ | ---- |
`,
      'utf8'
    );
    await fs.writeFile(
      diffFile,
      `# Diff

| ID | Action | External ID | Field changes | Idempotency key |
| --- | ------ | ----------- | ------------- | --------------- |
| TC-999 | create | | Title: TC1 | idemp-1 |
| TC-001 | delete | | | |
| TC-002 | create | | | idemp-exist |
| TC-003 | update | 99999 | | |
`,
      'utf8'
    );
    await fs.writeFile(
      planFile,
      `# Plan

| ID | Proposed action | Approval status |
| -- | --------------- | --------------- |
| TC-001 | Plan to delete | Approved |
| TC-002 | Plan to create | Approved |
| TC-003 | Plan to update | Approved |
`,
      'utf8'
    );
    await fs.writeFile(
      mappingFile,
      `[{"id": "TC-010", "externalId": "12345", "idempotencyKey": "idemp-exist"}]`,
      'utf8'
    );

    const res = runScript('validate-sync-diff.mjs', tmp, [
      '--diff-path',
      'diff.md',
      '--snapshot-path',
      'snapshot.md',
      '--plan-path',
      'plan.md',
      '--mapping-path',
      'mapping.json',
      '--json'
    ]);

    assert.equal(res.status, 1);
    const parsed = JSON.parse(res.stdout);
    assert.equal(parsed.ok, false);
    assert.ok(Array.isArray(parsed.findings));
    assert.ok(parsed.findings.every((finding) => finding.severity === 'error'));

    const errorsStr = parsed.errors.join('\n');
    assert.ok(errorsStr.includes('ID "TC-999" in sync diff is not present in the approved sync plan'));
    assert.ok(errorsStr.includes('delete action is not supported'));
    assert.ok(errorsStr.includes('idempotency key "idemp-exist" already exists in mapping file'));
    assert.ok(errorsStr.includes('external ID "99999" does not exist in mapping file'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-sync-diff: rejects required-column and idempotency violations', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-diff-'));
  try {
    const diffFile = path.join(tmp, 'diff.md');
    const snapshotFile = path.join(tmp, 'snapshot.md');
    const planFile = path.join(tmp, 'plan.md');
    const mappingFile = path.join(tmp, 'mapping.json');

    await fs.writeFile(
      snapshotFile,
      `# Snapshot
- Capture Timestamp: 2026-06-18T12:00:00Z

| External ID | Title | Section/Suite | Status |
| ----------- | ----- | ------------- | ------ |
| 12345       | TC1   | Suite1        | Active |
`,
      'utf8'
    );
    await fs.writeFile(
      diffFile,
      `# Diff

| ID | Action (create/update/skip) | External ID | Field changes | Idempotency key |
| --- | --------------------------- | ----------- | ------------- | --------------- |
| TC-001 | create | | Title: TC1 | |
| TC-002 | create | | Title: TC2 | duplicate-key |
| TC-003 | create | | Title: TC3 | duplicate-key |
`,
      'utf8'
    );
    await fs.writeFile(
      planFile,
      `# Plan

| ID | Proposed action | Approval status |
| -- | --------------- | --------------- |
| TC-001 | Plan to create | Approved |
| TC-002 | Plan to create | Approved |
| TC-003 | Plan to create | Approved |
`,
      'utf8'
    );
    await fs.writeFile(mappingFile, `{}`, 'utf8');

    const res = runScript('validate-sync-diff.mjs', tmp, [
      '--diff-path',
      'diff.md',
      '--snapshot-path',
      'snapshot.md',
      '--plan-path',
      'plan.md',
      '--mapping-path',
      'mapping.json',
      '--json'
    ]);

    assert.equal(res.status, 1);
    const parsed = JSON.parse(res.stdout);
    const errorsStr = parsed.errors.join('\n');
    assert.ok(errorsStr.includes('Snapshot: Remote snapshot table is missing required column "Hash"'));
    assert.ok(errorsStr.includes('create action is missing an idempotency key'));
    assert.ok(errorsStr.includes('duplicate idempotency key "duplicate-key" inside sync diff'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-sync-diff: rejects stale snapshots after sync plan approval', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-diff-'));
  try {
    const diffFile = path.join(tmp, 'diff.md');
    const snapshotFile = path.join(tmp, 'snapshot.md');
    const planFile = path.join(tmp, 'plan.md');
    const mappingFile = path.join(tmp, 'mapping.json');
    const runDir = path.join(tmp, '.qa-ai/state/runs/RUN-001');

    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(tmp, '.qa-ai/state/runs/active.json'), '{"runId":"RUN-001"}\n', 'utf8');
    await fs.writeFile(
      path.join(runDir, 'events.jsonl'),
      `${JSON.stringify({
        timestamp: '2026-06-18T12:00:00Z',
        type: 'approval.recorded',
        gate: 'external-write:test-management'
      })}\n`,
      'utf8'
    );

    await fs.writeFile(
      snapshotFile,
      `# Snapshot
- Capture Timestamp: 2026-06-18T11:59:00Z

| External ID | Title | Section/Suite | Status | Hash |
| ----------- | ----- | ------------- | ------ | ---- |
| 12345       | TC1   | Suite1        | Active | h1   |
`,
      'utf8'
    );
    await fs.writeFile(
      diffFile,
      `# Diff

| ID | Action | External ID | Field changes | Idempotency key |
| --- | ------ | ----------- | ------------- | --------------- |
| TC-001 | update | 12345 | Title: TC1 | |
`,
      'utf8'
    );
    await fs.writeFile(
      planFile,
      `# Plan

| ID | Proposed action | Approval status |
| -- | --------------- | --------------- |
| TC-001 | Plan to update | Approved |
`,
      'utf8'
    );
    await fs.writeFile(mappingFile, `{"TC-001": {"externalId": "12345"}}`, 'utf8');

    const res = runScript('validate-sync-diff.mjs', tmp, [
      '--diff-path',
      'diff.md',
      '--snapshot-path',
      'snapshot.md',
      '--plan-path',
      'plan.md',
      '--mapping-path',
      'mapping.json',
      '--json'
    ]);

    assert.equal(res.status, 1);
    const parsed = JSON.parse(res.stdout);
    assert.ok(parsed.errors.join('\n').includes('must be newer than the sync plan approval time'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-sync-result: accepts valid diff and results', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-res-'));
  try {
    const diffFile = path.join(tmp, 'diff.md');
    const applyLogFile = path.join(tmp, 'apply-log.md');
    const preSnapshotFile = path.join(tmp, 'snapshot.pre.md');
    const postSnapshotFile = path.join(tmp, 'snapshot.post.md');
    const rollbackFile = path.join(tmp, 'rollback.md');
    const mappingFile = path.join(tmp, 'mapping.json');

    await fs.writeFile(
      diffFile,
      `# Diff
| ID | Action | External ID | Field changes | Idempotency key |
| --- | ------ | ----------- | ------------- | --------------- |
| TC-001 | create | | Title: New | idemp-124 |
| TC-002 | update | C123 | Title: Update | |
`,
      'utf8'
    );

    await fs.writeFile(
      applyLogFile,
      `# Apply Log
| ID | Action | External ID | Result | Timestamp |
| --- | ------ | ----------- | ------ | --------- |
| TC-001 | create | C124 | applied | 2026-06-18T12:05:00Z |
| TC-002 | update | C123 | applied | 2026-06-18T12:06:00Z |
`,
      'utf8'
    );

    await fs.writeFile(
      preSnapshotFile,
      `# Pre Snapshot
- Capture Timestamp: 2026-06-18T10:00:00Z
| External ID | Title | Section/Suite | Status | Hash |
| ----------- | ----- | ------------- | ------ | ---- |
| C123 | Old | Suite | Active | hash-old |
`,
      'utf8'
    );

    await fs.writeFile(
      postSnapshotFile,
      `# Post Snapshot
- Capture Timestamp: 2026-06-18T13:00:00Z
| External ID | Title | Section/Suite | Status | Hash |
| ----------- | ----- | ------------- | ------ | ---- |
| C123 | New | Suite | Active | hash-new |
| C124 | Created | Suite | Active | hash-124 |
`,
      'utf8'
    );

    await fs.writeFile(
      rollbackFile,
      `# Rollback
| ID | Action | External ID | Rollback action | Rollback details | Status |
| --- | ------ | ----------- | --------------- | ---------------- | ------ |
| TC-001 | create | | delete | Delete | pending |
| TC-002 | update | C123 | restore | Restore | pending |
`,
      'utf8'
    );

    await fs.writeFile(
      mappingFile,
      `{
        "TC-001": {
          "externalId": "C124",
          "idempotencyKey": "idemp-124",
          "lastAppliedAt": "2026-06-18T12:05:00Z",
          "lastAppliedRunId": "RUN-001"
        },
        "TC-002": {
          "externalId": "C123",
          "lastAppliedAt": "2026-06-18T12:06:00Z",
          "lastAppliedRunId": "RUN-001"
        }
      }`,
      'utf8'
    );

    const res = runScript('validate-sync-result.mjs', tmp, [
      '--diff-path',
      'diff.md',
      '--apply-log-path',
      'apply-log.md',
      '--pre-snapshot-path',
      'snapshot.pre.md',
      '--post-snapshot-path',
      'snapshot.post.md',
      '--rollback-path',
      'rollback.md',
      '--mapping-path',
      'mapping.json'
    ]);

    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-sync-result: rejects invalid result states', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-res-fail-'));
  try {
    const diffFile = path.join(tmp, 'diff.md');
    const applyLogFile = path.join(tmp, 'apply-log.md');
    const preSnapshotFile = path.join(tmp, 'snapshot.pre.md');
    const postSnapshotFile = path.join(tmp, 'snapshot.post.md');
    const rollbackFile = path.join(tmp, 'rollback.md');
    const mappingFile = path.join(tmp, 'mapping.json');

    await fs.writeFile(
      diffFile,
      `# Diff
| ID | Action | External ID | Field changes | Idempotency key |
| --- | ------ | ----------- | ------------- | --------------- |
| TC-001 | create | | Title: New | idemp-124 |
| TC-002 | update | C123 | Title: Update | |
| TC-003 | update | C999 | Title: Fail | |
| TC-005 | create | | Title: Missing Map | idemp-125 |
| TC-006 | create | | Title: Missing Log | idemp-126 |
`,
      'utf8'
    );

    await fs.writeFile(
      applyLogFile,
      `# Apply Log
| ID | Action | External ID | Result | Timestamp |
| --- | ------ | ----------- | ------ | --------- |
| TC-001 | create | C124 | applied | 2026-06-18T12:05:00Z |
| TC-002 | update | C123 | applied | 2026-06-18T12:06:00Z |
| TC-003 | update | C999 | failed | 2026-06-18T12:07:00Z |
| TC-004 | create | C998 | applied | 2026-06-18T12:08:00Z |
| TC-005 | create | C997 | applied | 2026-06-18T12:09:00Z |
`,
      'utf8'
    );

    await fs.writeFile(
      preSnapshotFile,
      `# Pre Snapshot
- Capture Timestamp: 2026-06-18T10:00:00Z
| External ID | Title | Section/Suite | Status | Hash |
| ----------- | ----- | ------------- | ------ | ---- |
| C123 | Old | Suite | Active | hash-same |
| C999 | Fail | Suite | Active | hash-fail |
`,
      'utf8'
    );

    // Hash for C123 is unchanged, C124 is missing
    await fs.writeFile(
      postSnapshotFile,
      `# Post Snapshot
- Capture Timestamp: 2026-06-18T13:00:00Z
| External ID | Title | Section/Suite | Status | Hash |
| ----------- | ----- | ------------- | ------ | ---- |
| C123 | Old | Suite | Active | hash-same |
| C999 | Fail | Suite | Active | hash-fail |
`,
      'utf8'
    );

    // TC-003 failed but status is pending
    await fs.writeFile(
      rollbackFile,
      `# Rollback
| ID | Action | External ID | Rollback action | Rollback details | Status |
| --- | ------ | ----------- | --------------- | ---------------- | ------ |
| TC-001 | create | | delete | Delete | pending |
| TC-002 | update | C123 | restore | Restore | pending |
| TC-003 | update | C999 | restore | Restore | pending |
| TC-005 | create | | delete | Delete | pending |
`,
      'utf8'
    );

    // TC-001 has mapping entry, TC-002 is missing lastAppliedAt, TC-005 is missing from mapping
    await fs.writeFile(
      mappingFile,
      `[
        {"id": "TC-001", "externalId": "C124", "idempotencyKey": "idemp-124", "lastAppliedAt": "2026-06-18T12:05:00Z"},
        {"id": "TC-002", "externalId": "C123"}
      ]`,
      'utf8'
    );

    const res = runScript('validate-sync-result.mjs', tmp, [
      '--diff-path',
      'diff.md',
      '--apply-log-path',
      'apply-log.md',
      '--pre-snapshot-path',
      'snapshot.pre.md',
      '--post-snapshot-path',
      'snapshot.post.md',
      '--rollback-path',
      'rollback.md',
      '--mapping-path',
      'mapping.json',
      '--json'
    ]);

    assert.equal(res.status, 1);
    const parsed = JSON.parse(res.stdout);
    assert.equal(parsed.ok, false);
    assert.ok(Array.isArray(parsed.findings));

    const errorsStr = parsed.errors.join('\n');
    assert.ok(
      errorsStr.includes('is present in apply log but missing from sync diff'),
      'mismatched diff ID checks failed'
    );
    assert.ok(
      errorsStr.includes('ID "TC-006" is present in sync diff but missing from apply log'),
      'missing apply-log row check failed'
    );
    assert.ok(
      errorsStr.includes('failed action for ID "TC-003" has no corresponding row in the rollback plan') ||
        errorsStr.includes('rollback plan status is "pending", expected "failed"'),
      'failed rollback status check failed'
    );
    assert.ok(errorsStr.includes('is missing from the mapping file'), 'missing mapping check failed');
    assert.ok(errorsStr.includes('missing "lastAppliedAt"'), 'missing lastAppliedAt check failed');
    assert.ok(errorsStr.includes('missing "lastAppliedRunId"'), 'missing lastAppliedRunId check failed');
    assert.ok(
      errorsStr.includes('was not found in the post-apply snapshot'),
      'missing post-apply snapshot check failed'
    );
    assert.ok(
      errorsStr.includes('did not change between pre-apply and post-apply snapshots'),
      'unchanged hash check failed'
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
