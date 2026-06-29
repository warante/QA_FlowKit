#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getPhaseSkipReason,
  getTrackPhaseOrder,
  loadWorkflowContract
} from '../../lib/harness-contract.mjs';
import {
  checkPhase,
  getActiveRunSnapshot,
  getRunStatus,
  startRun
} from '../../lib/harness-controller.mjs';
import { writeRunSnapshot } from '../../lib/harness-run-store.mjs';
import { parseSimpleYaml } from '../../lib/utils.mjs';
import {
  prepareRepo,
  writeValidQualityReport
} from './_shared.mjs';

test('quick track skips test-management and automation phases', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const contract = await loadWorkflowContract(cwd);
    const order = getTrackPhaseOrder(contract, 'quick');
    assert.ok(!order.includes('tm-coverage'));
    assert.ok(!order.includes('feasibility'));

    assert.ok(!order.includes('test-design-system'));
    assert.ok(!order.includes('tm-coverage'));
    const snapshot = await startRun(cwd);
    assert.ok(!Object.hasOwn(snapshot.phases, 'test-design-system'));
    assert.ok(!Object.hasOwn(snapshot.phases, 'tm-coverage'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('enterprise track includes release-gate phase', async () => {
  const cwd = await prepareRepo('enterprise');
  try {
    const contract = await loadWorkflowContract(cwd);
    const order = getTrackPhaseOrder(contract, 'enterprise');
    assert.ok(order.includes('release-gate'));
    const snapshot = await startRun(cwd);
    assert.equal(snapshot.track, 'enterprise');
    assert.equal(snapshot.phases['release-gate'].status, 'pending');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('external intake phase is enabled only when configured and precedes coverage', async () => {
  const defaultCwd = await prepareRepo('standard');
  const enabledCwd = await prepareRepo('standard', {
    sources: {
      external: {
        enabled: true
      }
    },
    tools: { testManagement: 'testrail' }
  });
  try {
    await startRun(defaultCwd, { rfId: 'RF-EXT' });
    const defaultStatus = await getRunStatus(defaultCwd);
    assert.equal(
      defaultStatus.phases.some((phase) => phase.id === 'external-intake'),
      false
    );

    await startRun(enabledCwd, { rfId: 'RF-EXT' });
    const enabledStatus = await getRunStatus(enabledCwd);
    const phaseIds = enabledStatus.phases.map((phase) => phase.id);
    const externalIndex = phaseIds.indexOf('external-intake');
    const coverageIndex = phaseIds.indexOf('tm-coverage');
    assert.notEqual(externalIndex, -1);
    assert.notEqual(coverageIndex, -1);
    assert.ok(externalIndex < coverageIndex, 'external-intake must run before coverage analysis');
  } finally {
    await fs.rm(defaultCwd, { recursive: true, force: true });
    await fs.rm(enabledCwd, { recursive: true, force: true });
  }
});

test('quality report phase is conditional and runs validator in gate mode', async () => {
  const offCwd = await prepareRepo('standard');
  const gateCwd = await prepareRepo('standard', { testDesign: { quality: { mode: 'gate' } } });
  try {
    const offRun = await startRun(offCwd, { rfId: 'RF-9' });
    const offStatus = await getRunStatus(offCwd, offRun.runId);
    assert.ok(!offStatus.phases.some((phase) => phase.id === 'gherkin-quality'));

    const gateRun = await startRun(gateCwd, { rfId: 'RF-9' });
    const gateStatus = await getRunStatus(gateCwd, gateRun.runId);
    const phaseIds = gateStatus.phases.map((phase) => phase.id);
    assert.ok(phaseIds.includes('gherkin-quality'));
    assert.ok(phaseIds.indexOf('gherkin') < phaseIds.indexOf('gherkin-quality'));
    assert.ok(phaseIds.indexOf('gherkin-quality') < phaseIds.indexOf('traceability'));

    await writeValidQualityReport(gateCwd);
    const snapshot = await getActiveRunSnapshot(gateCwd);
    for (const phaseId of phaseIds) {
      if (phaseId === 'gherkin-quality') break;
      snapshot.phases[phaseId].status = 'completed';
    }
    snapshot.activePhaseId = 'gherkin-quality';
    snapshot.phases['gherkin-quality'].status = 'active';
    await writeRunSnapshot(gateCwd, snapshot);

    const result = await checkPhase(gateCwd, gateRun.runId);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.phaseId, 'gherkin-quality');
  } finally {
    await fs.rm(offCwd, { recursive: true, force: true });
    await fs.rm(gateCwd, { recursive: true, force: true });
  }
});

test('context phase skipped when knowledge disabled', async () => {
  const cwd = await prepareRepo('standard', { knowledge: { enabled: false } });
  try {
    const contract = await loadWorkflowContract(cwd);
    const config = parseSimpleYaml(await fs.readFile(path.join(cwd, 'qa-ai.config.yaml'), 'utf8'));
    const contextPhase = contract.phases.find((phase) => phase.id === 'context');
    assert.equal(getPhaseSkipReason(config, contextPhase), 'knowledge.enabled is false');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
