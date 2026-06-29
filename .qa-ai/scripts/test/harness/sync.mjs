#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getTrackPhaseOrder, loadWorkflowContract } from '../../lib/harness-contract.mjs';
import {
  approveGate,
  checkPhase,
  getActiveRunSnapshot,
  getRunStatus,
  nextPhase,
  setRfId,
  startRun
} from '../../lib/harness-controller.mjs';
import { writeRunSnapshot } from '../../lib/harness-run-store.mjs';
import { prepareRepo, writeValidGherkinFeature } from './_shared.mjs';

test('governed sync plan approval and invalidation on modification', async () => {
  const cwd = await prepareRepo('enterprise', {
    tools: { testManagement: 'testrail' },
    testManagementSync: {
      mode: 'governed',
      diffPath: 'qa-ai-output/test-management-sync-diff.md',
      applyLogPath: 'qa-ai-output/test-management-apply-log.md',
      rollbackPath: 'qa-ai-output/test-management-rollback-plan.md',
      remoteSnapshotPath: 'qa-ai-output/test-management-remote-snapshot.md'
    }
  });
  try {
    await startRun(cwd, { rfId: 'RF-GOV' });
    const initialStatus = await getRunStatus(cwd);
    const phaseIds = initialStatus.phases.map((phase) => phase.id);
    assert.ok(phaseIds.includes('sync-diff'));
    assert.ok(phaseIds.includes('sync-apply'));
    assert.ok(phaseIds.includes('sync-verify'));

    // Helper to write outputs and complete phases up to sync-apply
    const phasesToComplete = [
      { id: 'intake', file: 'qa-ai-output/requirement-analysis.md', content: '# analysis' },
      { id: 'normalize', file: 'qa-ai-output/normalized-requirements.md', content: '# normalized' },
      {
        id: 'test-design-system',
        file: 'qa-ai-output/test-design-system.md',
        content:
          '# System Test Design\n## Scope\n## Architecture alignment\n## Testability risks\n## Cross-RF coverage strategy\n## Shared fixtures and data\n## Non-functional focus\n## Open questions'
      },
      {
        id: 'test-design-rf',
        file: 'qa-ai-output/test-design-proposal.md',
        content:
          '# Test Design Proposal\n## Official RF ID\nRF-GOV\n## Scope\n## Proposed tests\n## Existing tests to reuse\n## Existing tests requiring modification\n## New tests to create\n## Ambiguities requiring user decision\n## Approval request'
      },
      { id: 'gherkin', file: 'features/functional/RF-GOV-TC-001.feature', content: '@rf:RF-GOV\nFeature: Test\n' },
      { id: 'tm-coverage', file: 'qa-ai-output/test-management-coverage-analysis.md', content: '# coverage' },
      {
        id: 'tm-sync',
        file: 'qa-ai-output/test-management-sync-plan.md',
        content:
          '# Sync Plan\nRequires approval before execution.\n\n| ID | Proposed action | Approval status |\n| --- | --- | --- |\n| RF-GOV | Plan to sync | Pending approval |\n| RF-9 | Plan to sync | Pending approval |\n| TC-001 | Plan to sync | Pending approval |\n'
      }
    ];

    for (const phase of phasesToComplete) {
      const packet = await nextPhase(cwd);
      assert.equal(packet.phase.id, phase.id);

      const absPath = path.join(cwd, phase.file);
      await fs.mkdir(path.dirname(absPath), { recursive: true });
      if (phase.id === 'gherkin') {
        await writeValidGherkinFeature(cwd, phase.file);
      } else {
        await fs.writeFile(absPath, phase.content, 'utf8');
      }

      if (phase.id === 'gherkin') {
        await setRfId(cwd, 'RF-GOV');
        await approveGate(cwd, 'test-design');
      }

      const checkRes = await checkPhase(cwd);
      assert.equal(checkRes.ok, true, `Phase ${phase.id} check failed: ${JSON.stringify(checkRes)}`);
    }

    // Now at sync-diff phase
    const diffPacket = await nextPhase(cwd);
    assert.equal(diffPacket.phase.id, 'sync-diff');
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-remote-snapshot.md'),
      '# Remote Snapshot\n- Tool: testrail\n- Project: Harness\n- Capture Timestamp: 2026-06-18T13:00:00Z\n- Run ID: RUN-001\n\n| External ID | Title | Section/Suite | Status | Hash |\n| ----------- | ----- | ------------- | ------ | ---- |\n| 12345 | TC1 | Suite1 | Active | h1 |\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-sync-diff.md'),
      '# Sync Diff\n- Generated at: 2026-06-18T13:00:00Z\n- Sync Mode: governed\n\n| ID | Action | External ID | Field changes | Idempotency key |\n| --- | ------ | ----------- | ------------- | --------------- |\n| RF-GOV | create | | Title: TC1 | idemp-1 |\n| RF-9 | skip | | | |\n| TC-001 | skip | | | |\n',
      'utf8'
    );
    const diffCheck = await checkPhase(cwd);
    assert.equal(diffCheck.ok, true, `Sync-diff check failed: ${JSON.stringify(diffCheck)}`);

    // Now at sync-apply phase, which is blocked by external-write:test-management entry approval
    const applyPacket = await nextPhase(cwd);
    assert.equal(applyPacket.phase.id, 'sync-apply');
    assert.equal(applyPacket.phase.status, 'blocked');
    assert.ok(applyPacket.blockers.some((b) => b.gate === 'external-write:test-management'));

    // Approve the gate: records the planHash of qa-ai-output/test-management-sync-plan.md (# sync plan v1)
    const approveRes = await approveGate(cwd, 'external-write:test-management');
    const approval = approveRes.approvals.find((a) => a.gate === 'external-write:test-management');
    assert.ok(approval.planHash, 'Approval must record planHash');

    // Run next again: should be active now (unblocked)
    const applyStillBlocked = await nextPhase(cwd);
    assert.equal(applyStillBlocked.phase.status, 'blocked');
    assert.ok(
      applyStillBlocked.blockers.some(
        (b) => b.type === 'missing-inputs' && b.missing.includes('qa-ai-output/test-management-rollback-plan.md')
      ),
      'sync-apply must remain blocked until rollback plan exists'
    );

    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-rollback-plan.md'),
      '# Rollback\n| ID | Action | External ID | Rollback action | Rollback details | Status |\n| --- | ------ | ----------- | --------------- | ---------------- | ------ |\n| RF-GOV | create | | deactivate | Deactivate by idempotency key idemp-1 | pending |\n| RF-9 | skip | | none | No change | pending |\n| TC-001 | skip | | none | No change | pending |\n',
      'utf8'
    );

    const applyUnblocked = await nextPhase(cwd);
    assert.equal(applyUnblocked.phase.status, 'active');
    assert.equal(applyUnblocked.blockers.length, 0);

    // Modify the sync plan file!
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-sync-plan.md'),
      '# Sync Plan\nRequires approval before execution.\n\n| ID | Proposed action | Approval status |\n| --- | --- | --- |\n| RF-GOV | Plan to sync - modified | Pending approval |\n| RF-9 | Plan to sync - modified | Pending approval |\n| TC-001 | Plan to sync - modified | Pending approval |\n',
      'utf8'
    );

    // Calling checkPhase (or nextPhase) should trigger invalidation!
    const checkAfterModify = await checkPhase(cwd);
    assert.equal(checkAfterModify.ok, false);
    assert.ok(
      checkAfterModify.blockers.some((b) => b.gate === 'external-write:test-management'),
      'Approval should be invalidated and blocked again'
    );

    // Verify snapshot doesn't have the approval anymore
    const snap = await getActiveRunSnapshot(cwd);
    assert.ok(
      !snap.approvals.some((a) => a.gate === 'external-write:test-management'),
      'Approval must be removed from approvals list'
    );

    // Verify run event log contains approval_invalidated event
    const logPath = path.join(cwd, '.qa-ai', 'state', 'runs', snap.runId, 'events.jsonl');
    const eventsContent = await fs.readFile(logPath, 'utf8');
    assert.ok(eventsContent.includes('approval_invalidated'), 'Events log must contain approval_invalidated');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('governed sync apply and verify emit ordered audit events', async () => {
  const cwd = await prepareRepo('enterprise', {
    tools: { testManagement: 'testrail' },
    testManagementSync: {
      mode: 'governed',
      diffPath: 'qa-ai-output/test-management-sync-diff.md',
      applyLogPath: 'qa-ai-output/test-management-apply-log.md',
      rollbackPath: 'qa-ai-output/test-management-rollback-plan.md',
      remoteSnapshotPath: 'qa-ai-output/test-management-remote-snapshot.md'
    }
  });
  try {
    await startRun(cwd, { rfId: 'RF-GOV' });
    const contract = await loadWorkflowContract(cwd);
    const order = getTrackPhaseOrder(contract, 'enterprise');
    const snapshot = await getActiveRunSnapshot(cwd);
    for (const phaseId of order) {
      if (phaseId === 'sync-apply' || phaseId === 'sync-verify') break;
      snapshot.phases[phaseId].status = 'completed';
    }
    snapshot.activePhaseId = null;
    snapshot.status = 'active';
    await writeRunSnapshot(cwd, snapshot);

    await fs.mkdir(path.join(cwd, 'qa-ai-output'), { recursive: true });
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-sync-plan.md'),
      '# Sync Plan\n| ID | Proposed action | Approval status |\n| --- | --- | --- |\n| TC-001 | Plan to create | Approved |\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-sync-diff.md'),
      '# Sync Diff\n| ID | Action | External ID | Field changes | Idempotency key |\n| --- | ------ | ----------- | ------------- | --------------- |\n| TC-001 | create | | Title: Created | idemp-1 |\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-remote-snapshot.md'),
      '# Pre Snapshot\n- Capture Timestamp: 2026-06-18T12:00:00Z\n| External ID | Title | Section/Suite | Status | Hash |\n| ----------- | ----- | ------------- | ------ | ---- |\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-rollback-plan.md'),
      '# Rollback\n| ID | Action | External ID | Rollback action | Rollback details | Status |\n| --- | ------ | ----------- | --------------- | ---------------- | ------ |\n| TC-001 | create | | deactivate | Deactivate by idempotency key idemp-1 | pending |\n',
      'utf8'
    );

    await approveGate(cwd, 'external-write:test-management');
    const applyPacket = await nextPhase(cwd);
    assert.equal(applyPacket.phase.id, 'sync-apply');
    assert.equal(applyPacket.phase.status, 'active');

    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-apply-log.md'),
      '# Apply Log\n| ID | Action | External ID | Result | Timestamp |\n| --- | ------ | ----------- | ------ | --------- |\n| TC-001 | create | C124 | applied | 2026-06-18T12:05:00Z |\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-mapping.json'),
      `{"TC-001":{"externalId":"C124","idempotencyKey":"idemp-1","lastAppliedAt":"2026-06-18T12:05:00Z","lastAppliedRunId":"${snapshot.runId}"}}\n`,
      'utf8'
    );

    const applyCheck = await checkPhase(cwd);
    assert.equal(applyCheck.ok, true, `sync-apply check failed: ${JSON.stringify(applyCheck)}`);

    const verifyPacket = await nextPhase(cwd);
    assert.equal(verifyPacket.phase.id, 'sync-verify');
    assert.equal(verifyPacket.phase.status, 'active');
    await fs.writeFile(
      path.join(cwd, 'qa-ai-output/test-management-remote-snapshot.post.md'),
      '# Post Snapshot\n- Capture Timestamp: 2026-06-18T13:00:00Z\n| External ID | Title | Section/Suite | Status | Hash |\n| ----------- | ----- | ------------- | ------ | ---- |\n| C124 | Created | Suite | Active | hash-created |\n',
      'utf8'
    );

    const verifyCheck = await checkPhase(cwd);
    assert.equal(verifyCheck.ok, true, `sync-verify check failed: ${JSON.stringify(verifyCheck)}`);

    const eventsPath = path.join(cwd, '.qa-ai/state/runs', snapshot.runId, 'events.jsonl');
    const eventTypes = (await fs.readFile(eventsPath, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line).type);
    const approvalIndex = eventTypes.indexOf('approval.recorded');
    const applyIndex = eventTypes.indexOf('sync_apply.started');
    const verifyIndex = eventTypes.indexOf('sync_verify.started');
    assert.ok(approvalIndex !== -1, 'approval event must be recorded');
    assert.ok(applyIndex > approvalIndex, 'apply-start event must follow approval');
    assert.ok(verifyIndex > applyIndex, 'verify event must follow apply-start');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
