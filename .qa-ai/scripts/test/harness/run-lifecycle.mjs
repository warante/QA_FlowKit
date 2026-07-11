#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveConfigHarnessPath, resolveHarnessRelativePath } from '../../lib/harness-paths.mjs';
import { loadWorkflowContract } from '../../lib/harness-contract.mjs';
import {
  approveGate,
  buildRunId,
  checkPhase,
  getActiveRunSnapshot,
  getRunStatus,
  nextPhase,
  resumeRun,
  retryPhase,
  setRfId,
  startRun
} from '../../lib/harness-controller.mjs';
import { modificationApprovalGateId } from '../../lib/harness-modification.mjs';
import { assertConfigPathsSafe } from '../../lib/harness-validation.mjs';
import { writeRunSnapshot } from '../../lib/harness-run-store.mjs';
import { parseSimpleYaml } from '../../lib/utils.mjs';
import { advanceToPhase, configRelPath, node, prepareRepo, runCli, writeValidGherkinFeature } from './_shared.mjs';
import { DEFAULT_FEATURE_PATH } from '../../lib/artifact-paths.mjs';

test('run start, next idempotency and resume', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const snapshot = await startRun(cwd, { rfId: 'RF-1' });
    const first = await nextPhase(cwd);
    const second = await nextPhase(cwd);
    assert.equal(first.phase.id, second.phase.id);
    assert.equal(first.phase.status, 'active');

    const resumed = await resumeRun(cwd, snapshot.runId);
    assert.equal(resumed.runId, snapshot.runId);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('set-rf and approve gate unblock gherkin phase', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await startRun(cwd);
    const packet = await advanceToPhase(cwd, 'gherkin');
    assert.equal(packet.phase.id, 'gherkin');
    assert.ok(packet.blockers.some((item) => item.type === 'rf' || item.type === 'approval'));

    await setRfId(cwd, 'RF-42');
    await approveGate(cwd, 'test-design', { note: 'approved by test' });
    const unblocked = await nextPhase(cwd);
    const blockerTypes = unblocked.blockers.map((item) => item.type);
    assert.ok(!blockerTypes.includes('rf'));
    assert.ok(!blockerTypes.includes('approval'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('run next prints localized approval blocker help while provisional Gherkin remains allowed', async () => {
  const cwd = await prepareRepo('quick', {
    project: { qaTrack: 'quick', interfaceLanguage: 'es', defaultLanguage: 'es' }
  });
  try {
    await startRun(cwd);
    await advanceToPhase(cwd, 'gherkin');

    const human = runCli(cwd, ['run', 'next']);
    assert.match(human.stdout, /Bloqueado/);
    assert.match(human.stdout, /npx qa-flowkit run approve test-design/);

    const json = runCli(cwd, ['run', 'next', '--json']);
    const payload = JSON.parse(json.stdout);
    assert.ok(!payload.blockers.some((item) => item.type === 'rf'));
    assert.ok(payload.blockers.some((item) => item.type === 'approval'));
    assert.ok(payload.blockerHelp.some((item) => item.includes('Bloqueado')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validation retries then block phase', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await startRun(cwd);
    await advanceToPhase(cwd, 'normalize');
    await setRfId(cwd, 'RF-9');
    await approveGate(cwd, 'test-design');
    const packet = await advanceToPhase(cwd, 'gherkin');
    assert.equal(packet.phase.id, 'gherkin');

    const first = await checkPhase(cwd, { maxAttempts: 2 });
    assert.equal(first.ok, false);
    const second = await checkPhase(cwd, { maxAttempts: 2 });
    assert.equal(second.ok, false);
    assert.equal(second.blocked, true);

    const whileBlocked = await checkPhase(cwd);
    assert.equal(whileBlocked.retryable, true);
    assert.match(whileBlocked.message || '', /retry/i);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validation block recovers via retry and completes phase', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await startRun(cwd);
    await nextPhase(cwd);
    assert.equal((await checkPhase(cwd)).ok, false);
    assert.equal((await checkPhase(cwd)).blocked, true);

    const retried = await retryPhase(cwd);
    assert.equal(retried.ok, true);
    assert.equal(retried.attempts, 0);

    await fs.writeFile(path.join(cwd, '.qa-ai/output', 'requirement-analysis.md'), '# intake\n', 'utf8');
    const passed = await checkPhase(cwd);
    assert.equal(passed.ok, true);
    assert.equal(passed.phaseId, 'intake');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('CLI retry flow after validation block', async () => {
  const cwd = await prepareRepo('quick');
  try {
    runCli(cwd, ['run', 'start']);
    runCli(cwd, ['run', 'next']);
    runCli(cwd, ['run', 'check'], { expectFailure: true });
    runCli(cwd, ['run', 'check'], { expectFailure: true });
    const blocked = runCli(cwd, ['run', 'check', '--json'], { expectFailure: true });
    const blockedPayload = JSON.parse(blocked.stdout);
    assert.equal(blockedPayload.retryable, true);

    const retryResult = runCli(cwd, ['run', 'retry', '--json']);
    JSON.parse(retryResult.stdout);

    await fs.writeFile(path.join(cwd, '.qa-ai/output', 'requirement-analysis.md'), '# intake\n', 'utf8');
    runCli(cwd, ['run', 'check']);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('unsafe config paths are rejected at run start', async () => {
  const cwd = await prepareRepo('quick', { gherkin: { featurePath: '../outside' } });
  try {
    const config = parseSimpleYaml(await fs.readFile(path.join(cwd, configRelPath), 'utf8'));
    const contract = await loadWorkflowContract(cwd);
    assert.throws(() => assertConfigPathsSafe(cwd, config, contract), /inside the repository|must stay/i);
    await assert.rejects(() => startRun(cwd), /inside the repository|must stay/i);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('resolveHarnessRelativePath rejects absolute and escaping paths', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-paths-'));
  try {
    const safe = resolveHarnessRelativePath(cwd, '.qa-ai/output/x.md');
    assert.ok(safe.absolute?.replaceAll('\\', '/').includes('.qa-ai/output'));

    assert.throws(() => resolveHarnessRelativePath(cwd, '../outside'), /inside the repository|must stay/i);
    assert.throws(
      () => resolveHarnessRelativePath(cwd, process.platform === 'win32' ? 'C:\\outside' : '/outside'),
      /absolute paths are not allowed/i
    );
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('resolveHarnessRelativePath rejects symlink or junction escapes', async (t) => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-link-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-outside-'));
  try {
    const linkPath = path.join(cwd, 'features-linked');
    try {
      await fs.symlink(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        t.skip(`symlink/junction creation is not available: ${error.code}`);
        return;
      }
      throw error;
    }

    assert.throws(
      () => resolveHarnessRelativePath(cwd, 'features-linked', { label: 'feature root' }),
      /inside the repository|must stay/i
    );
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test('unsafe $config feature root is rejected for hashing', async () => {
  const cwd = await prepareRepo('quick', { gherkin: { featurePath: '../outside' } });
  try {
    const config = parseSimpleYaml(await fs.readFile(path.join(cwd, configRelPath), 'utf8'));
    assert.throws(
      () => resolveConfigHarnessPath(cwd, config, '$config.gherkin.featurePath', DEFAULT_FEATURE_PATH, 'feature root'),
      /inside the repository|must stay/i
    );
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('modification approval for new output is not required', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await startRun(cwd);
    await nextPhase(cwd);
    await fs.writeFile(path.join(cwd, '.qa-ai/output', 'requirement-analysis.md'), '# new\n', 'utf8');
    const result = await checkPhase(cwd);
    assert.equal(result.ok, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('unchanged pre-existing output does not require modification approval', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, '.qa-ai/output', 'requirement-analysis.md');
    await fs.writeFile(outputPath, '# unchanged\n', 'utf8');
    await startRun(cwd);
    await nextPhase(cwd);
    const result = await checkPhase(cwd);
    assert.equal(result.ok, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('entry-blocked gherkin captures baseline and enforces modification after unblock', async () => {
  const cwd = await prepareRepo('quick');
  const featureRel = `${DEFAULT_FEATURE_PATH}/RF-42-TC-001-existing.feature`;
  try {
    await writeValidGherkinFeature(cwd, featureRel);
    await startRun(cwd);
    await nextPhase(cwd);
    await fs.writeFile(path.join(cwd, '.qa-ai/output', 'requirement-analysis.md'), '# intake\n', 'utf8');
    await checkPhase(cwd);
    await nextPhase(cwd);
    await fs.writeFile(path.join(cwd, '.qa-ai/output', 'normalized-requirements.md'), '# normalize\n', 'utf8');
    await checkPhase(cwd);

    const blocked = await nextPhase(cwd);
    assert.equal(blocked.phase.id, 'gherkin');
    assert.ok(blocked.blockers.some((item) => item.type === 'rf' || item.type === 'approval'));

    const snapshot = await getActiveRunSnapshot(cwd);
    const gherkinState = snapshot.phases.gherkin;
    assert.equal(gherkinState.baselineCaptured, true);
    assert.ok(gherkinState.baselineOutputs.some((item) => item.path.endsWith('.feature')));

    await setRfId(cwd, 'RF-42');
    await approveGate(cwd, 'test-design');
    const unblocked = await nextPhase(cwd);
    assert.ok(!unblocked.blockers.some((item) => item.type === 'modification'));
    assert.ok(!unblocked.blockers.some((item) => item.type === 'rf' || item.type === 'approval'));

    await fs.appendFile(path.join(cwd, featureRel), '\n# edited\n', 'utf8');
    const modBlocked = await checkPhase(cwd);
    assert.equal(modBlocked.ok, false);
    assert.ok(modBlocked.blockers?.some((item) => item.type === 'modification'));

    await approveGate(cwd, modificationApprovalGateId('gherkin'));
    const passed = await checkPhase(cwd);
    assert.equal(passed.ok, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('repeated next and resume stay idempotent for unchanged pre-existing outputs', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, '.qa-ai/output', 'requirement-analysis.md');
    await fs.writeFile(outputPath, '# unchanged\n', 'utf8');
    const snapshot = await startRun(cwd);
    const first = await nextPhase(cwd);
    const second = await nextPhase(cwd);
    const third = await resumeRun(cwd, snapshot.runId);

    for (const packet of [first, second, third]) {
      assert.ok(!packet.blockers?.some((item) => item.type === 'modification'));
    }
    assert.equal(first.phase.id, second.phase.id);
    assert.equal(second.phase.id, third.phase.id);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('resume persists the selected phase baseline before later edits', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, '.qa-ai/output', 'requirement-analysis.md');
    await fs.writeFile(outputPath, '# before resume\n', 'utf8');
    const snapshot = await startRun(cwd);
    const resumed = await resumeRun(cwd, snapshot.runId);
    assert.equal(resumed.phase.id, 'intake');
    assert.equal(resumed.phase.status, 'active');

    const persisted = await getActiveRunSnapshot(cwd);
    assert.equal(persisted.activePhaseId, 'intake');
    assert.equal(persisted.phases.intake.baselineCaptured, true);

    await fs.writeFile(outputPath, '# modified after resume\n', 'utf8');
    const next = await nextPhase(cwd);
    assert.ok(next.blockers?.some((item) => item.type === 'modification'));

    const checked = await checkPhase(cwd);
    assert.equal(checked.ok, false);
    assert.ok(checked.blockers?.some((item) => item.type === 'modification'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('status reports current modification blockers without changing the baseline', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, '.qa-ai/output', 'requirement-analysis.md');
    await fs.writeFile(outputPath, '# v1\n', 'utf8');
    await startRun(cwd);
    await nextPhase(cwd);
    const baseline = await getActiveRunSnapshot(cwd);

    await fs.writeFile(outputPath, '# v2\n', 'utf8');
    const status = await getRunStatus(cwd);
    assert.ok(status.blockers?.some((item) => item.type === 'modification'));
    assert.ok(status.blockerHelp?.some((item) => item.includes('npx qa-flowkit run approve modify-existing:intake')));

    const afterStatus = await getActiveRunSnapshot(cwd);
    assert.deepEqual(afterStatus.phases.intake.baselineOutputs, baseline.phases.intake.baselineOutputs);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('repeated next reports modification blocker when pre-existing output changed', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, '.qa-ai/output', 'requirement-analysis.md');
    await fs.writeFile(outputPath, '# v1\n', 'utf8');
    await startRun(cwd);
    await nextPhase(cwd);
    await fs.writeFile(outputPath, '# v2\n', 'utf8');
    const again = await nextPhase(cwd);
    assert.ok(again.blockers?.some((item) => item.type === 'modification'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('buildRunId resists same-RF same-second collisions', () => {
  const fixed = new Date('2026-06-06T12:00:00.000Z');
  const id1 = buildRunId('RF-COLLIDE', { now: fixed });
  const id2 = buildRunId('RF-COLLIDE', { now: fixed, disambiguator: 1 });
  assert.notEqual(id1, id2);
  assert.ok(id2.endsWith('-1'));
});

test('startRun creates distinct runs for same RF and timestamp', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const fixed = new Date('2026-06-06T12:00:00.123Z');
    const run1 = await startRun(cwd, { rfId: 'RF-COLLIDE', now: fixed });
    const run2 = await startRun(cwd, { rfId: 'RF-COLLIDE', now: fixed });
    assert.notEqual(run1.runId, run2.runId);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('startRun avoids collisions across separate Node processes', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const controllerUrl = new URL('../../lib/harness-controller.mjs', import.meta.url).href;
    const code = [
      `import { startRun } from ${JSON.stringify(controllerUrl)};`,
      `const run = await startRun(${JSON.stringify(cwd)}, {`,
      "  rfId: 'RF-PROCESS',",
      "  now: new Date('2026-06-06T12:00:00.123Z')",
      '});',
      'console.log(run.runId);'
    ].join('\n');

    const first = spawnSync(node, ['--input-type=module', '-e', code], { encoding: 'utf8', shell: false });
    const second = spawnSync(node, ['--input-type=module', '-e', code], { encoding: 'utf8', shell: false });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.notEqual(first.stdout.trim(), second.stdout.trim());
    assert.ok(second.stdout.trim().endsWith('-1'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('run IDs reject path traversal before filesystem writes', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await assert.rejects(() => resumeRun(cwd, '../../escaped'), /invalid run ID/i);
    await assert.rejects(() => resumeRun(cwd, 'nested/run'), /invalid run ID/i);
    await assert.rejects(() => resumeRun(cwd, '..\\escaped'), /invalid run ID/i);
    await assert.rejects(() => fs.access(path.join(cwd, '.qa-ai', 'escaped')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('concurrent starts use independent atomic temporary files', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const fixed = new Date('2026-06-06T12:00:00.123Z');
    const starts = Array.from({ length: 8 }, (_, index) =>
      startRun(cwd, { rfId: `RF-CONCURRENT-${index}`, now: fixed })
    );
    const runs = await Promise.all(starts);
    assert.equal(new Set(runs.map((run) => run.runId)).size, runs.length);
    for (const run of runs) {
      const snapshotPath = path.join(cwd, '.qa-ai', 'state', 'runs', run.runId, 'run.json');
      assert.equal(JSON.parse(await fs.readFile(snapshotPath, 'utf8')).runId, run.runId);
    }
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('modified pre-existing output requires scoped modification approval', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, '.qa-ai/output', 'requirement-analysis.md');
    await fs.writeFile(outputPath, '# v1\n', 'utf8');
    await startRun(cwd);
    const packet = await nextPhase(cwd);
    assert.equal(packet.phase.modificationGate, modificationApprovalGateId('intake'));

    await fs.writeFile(outputPath, '# v2\n', 'utf8');
    const blocked = await checkPhase(cwd);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.blockers?.some((item) => item.type === 'modification'));

    await assert.rejects(
      () => approveGate(cwd, modificationApprovalGateId('gherkin')),
      /scoped to phase|active phase/i
    );
    await approveGate(cwd, modificationApprovalGateId('intake'));
    const passed = await checkPhase(cwd);
    assert.equal(passed.ok, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('gherkin recovery after validator failures uses retry', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await startRun(cwd);
    await advanceToPhase(cwd, 'normalize');
    await setRfId(cwd, 'RF-9');
    await approveGate(cwd, 'test-design');
    await advanceToPhase(cwd, 'gherkin');

    await fs.writeFile(path.join(cwd, DEFAULT_FEATURE_PATH, 'bad.feature'), 'Feature: invalid\n', 'utf8');
    await checkPhase(cwd, { maxAttempts: 2 });
    assert.equal((await checkPhase(cwd)).blocked, true);

    await retryPhase(cwd);
    await writeValidGherkinFeature(cwd);
    await fs.rm(path.join(cwd, DEFAULT_FEATURE_PATH, 'bad.feature'), { force: true });
    const passed = await checkPhase(cwd);
    assert.equal(passed.ok, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('completed run is immutable', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const snapshot = await startRun(cwd);
    snapshot.status = 'completed';
    await writeRunSnapshot(cwd, snapshot);
    await assert.rejects(() => setRfId(cwd, 'RF-IM'), /immutable/i);
    await assert.rejects(() => resumeRun(cwd, snapshot.runId), /completed/i);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
