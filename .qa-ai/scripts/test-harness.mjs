#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  clearContractCache,
  evaluateSkipCondition,
  getPhaseSkipReason,
  getTrackPhaseOrder,
  loadWorkflowContract,
  validateWorkflowContract,
  validateWorkflowContractData
} from './lib/harness-contract.mjs';
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
} from './lib/harness-controller.mjs';
import { modificationApprovalGateId } from './lib/harness-modification.mjs';
import { resolveConfigHarnessPath, resolveHarnessRelativePath } from './lib/harness-paths.mjs';
import { inspectQaWorkflow } from './lib/qa-next-steps.mjs';
import { atomicWriteJson, withRunLock, writeRunSnapshot } from './lib/harness-run-store.mjs';
import {
  assertConfigPathsSafe,
  assertNoteHasNoSecrets,
  isValidatorAllowed,
  redactDiagnostics
} from './lib/harness-validation.mjs';
import { parseSimpleYaml } from './lib/utils.mjs';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cli = path.join(sourceRoot, 'bin', 'qa-flowkit.mjs');
const node = process.execPath;

async function copyFramework(targetRoot) {
  await fs.cp(path.join(sourceRoot, '.qa-ai'), path.join(targetRoot, '.qa-ai'), { recursive: true, force: true });
}

async function writeConfig(targetRoot, overrides = {}) {
  const base = {
    version: 1,
    project: {
      name: 'Harness Test',
      repoMode: 'qa-design-only',
      qaTrack: 'standard',
      defaultLanguage: 'en',
      interfaceLanguage: 'en'
    },
    tools: { testManagement: 'none', issueTracker: 'none', documentation: 'markdown' },
    knowledge: { enabled: false },
    requirements: { requireOfficialRfId: true },
    gherkin: { language: 'en', featurePath: 'features' },
    testDesign: {
      proposalPath: 'qa-ai-output/test-design-proposal.md',
      systemPath: 'qa-ai-output/test-design-system.md'
    },
    traceability: { matrixPath: 'qa-ai-output/traceability-matrix.md' },
    automation: { ui: { framework: 'none' }, api: { framework: 'none' } },
    release: { gatePath: 'qa-ai-output/release-gate.yaml' }
  };
  const merged = JSON.parse(JSON.stringify(base));
  Object.assign(merged.project, overrides.project || {});
  if (overrides.tools) Object.assign(merged.tools, overrides.tools);
  if (overrides.knowledge) Object.assign(merged.knowledge, overrides.knowledge);
  if (overrides.automation) Object.assign(merged.automation, overrides.automation);
  if (overrides.gherkin) Object.assign(merged.gherkin, overrides.gherkin);

  const lines = [
    'version: 1',
    'project:',
    `  name: ${merged.project.name}`,
    `  repoMode: ${merged.project.repoMode}`,
    `  qaTrack: ${merged.project.qaTrack}`,
    `  defaultLanguage: ${merged.project.defaultLanguage}`,
    `  interfaceLanguage: ${merged.project.interfaceLanguage}`,
    'tools:',
    `  testManagement: ${merged.tools.testManagement}`,
    `  issueTracker: ${merged.tools.issueTracker}`,
    'knowledge:',
    `  enabled: ${merged.knowledge.enabled}`,
    'requirements:',
    '  requireOfficialRfId: true',
    'gherkin:',
    '  language: en',
    `  featurePath: ${merged.gherkin.featurePath}`,
    'testDesign:',
    '  proposalPath: qa-ai-output/test-design-proposal.md',
    '  systemPath: qa-ai-output/test-design-system.md',
    'traceability:',
    '  matrixPath: qa-ai-output/traceability-matrix.md',
    'automation:',
    '  ui:',
    `    framework: ${merged.automation.ui.framework}`,
    '  api:',
    `    framework: ${merged.automation.api.framework}`,
    'release:',
    '  gatePath: qa-ai-output/release-gate.yaml',
    ''
  ];
  await fs.mkdir(path.join(targetRoot, 'qa-ai-output'), { recursive: true });
  await fs.mkdir(path.join(targetRoot, 'features'), { recursive: true });
  await fs.writeFile(path.join(targetRoot, 'qa-ai.config.yaml'), lines.join('\n'), 'utf8');
}

async function prepareRepo(track = 'standard', extra = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-'));
  await copyFramework(dir);
  await writeConfig(dir, { project: { qaTrack: track }, ...extra });
  return dir;
}

function runCli(cwd, args, { expectFailure = false } = {}) {
  const result = spawnSync(node, [cli, ...args], { cwd, encoding: 'utf8', shell: false });
  const failed = result.status !== 0;
  if (expectFailure ? !failed : failed) {
    throw new Error(`CLI failed: qa-flowkit ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function writeValidGherkinFeature(cwd, relativePath = 'features/RF-9-TC-001-sample.feature') {
  const featurePath = path.join(cwd, relativePath);
  await fs.mkdir(path.dirname(featurePath), { recursive: true });
  await fs.writeFile(
    featurePath,
    `@priority:high @type:functional @manual:true @rf:RF-9 @id:TC-001
Feature: Sample
  Acceptance Criteria:
    - Sample passes validation

  Scenario: RF-9 TC-001 Sample scenario
    Given a precondition
    When an action happens
    Then the outcome is visible
`,
    'utf8'
  );
}

test('workflow contract validates in source repository', async () => {
  const result = await validateWorkflowContract(sourceRoot);
  assert.equal(result.ok, true, result.errors?.join('\n'));
});

test('contract rejects unknown validator and unsafe paths', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-bad-'));
  try {
    const bad = {
      schemaVersion: 1,
      trackOrder: { quick: ['intake'] },
      phases: [
        {
          id: 'intake',
          name: 'Intake',
          guidance: ['../outside.md'],
          inputs: [],
          outputs: [{ path: 'qa-ai-output/x.md' }],
          entryApprovals: [],
          validators: ['unknown-validator'],
          skipConditions: [],
          permissions: {
            createLocal: 'allowed',
            modifyExisting: 'approval',
            externalWrite: 'denied',
            delete: 'denied'
          }
        }
      ]
    };
    const errors = validateWorkflowContractData(cwd, bad);
    assert.ok(errors.some((item) => item.includes('unknown validator')));
    assert.ok(errors.some((item) => item.includes('traverse') || item.includes('outside')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

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

async function writePhaseOutput(cwd, phaseId) {
  const outputs = {
    intake: 'qa-ai-output/requirement-analysis.md',
    normalize: 'qa-ai-output/normalized-requirements.md',
    gherkin: 'features/sample.feature',
    traceability: 'qa-ai-output/traceability-matrix.md',
    pr: 'qa-ai-output/pr-summary.md'
  };
  const target = outputs[phaseId];
  if (!target) return;
  const absolute = path.join(cwd, target);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, phaseId === 'gherkin' ? 'Feature: sample\n' : '# ok\n', 'utf8');
}

async function advanceToPhase(cwd, targetPhaseId) {
  let packet = await nextPhase(cwd);
  let guard = 0;
  while (packet.phase && packet.phase.id !== targetPhaseId && guard++ < 12) {
    if (packet.blockers?.length) return packet;
    await writePhaseOutput(cwd, packet.phase.id);
    const result = await checkPhase(cwd);
    if (!result.ok) return packet;
    packet = await nextPhase(cwd);
  }
  return packet;
}

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

    await fs.writeFile(path.join(cwd, 'qa-ai-output', 'requirement-analysis.md'), '# intake\n', 'utf8');
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

    await fs.writeFile(path.join(cwd, 'qa-ai-output', 'requirement-analysis.md'), '# intake\n', 'utf8');
    runCli(cwd, ['run', 'check']);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('unsafe config paths are rejected at run start', async () => {
  const cwd = await prepareRepo('quick', { gherkin: { featurePath: '../outside' } });
  try {
    const config = parseSimpleYaml(await fs.readFile(path.join(cwd, 'qa-ai.config.yaml'), 'utf8'));
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
    const safe = resolveHarnessRelativePath(cwd, 'qa-ai-output/x.md');
    assert.ok(safe.absolute?.includes('qa-ai-output'));

    assert.throws(() => resolveHarnessRelativePath(cwd, '../outside'), /inside the repository|must stay/i);
    assert.throws(
      () => resolveHarnessRelativePath(cwd, process.platform === 'win32' ? 'C:\\outside' : '/outside'),
      /absolute paths are not allowed/i
    );
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('unsafe $config feature root is rejected for hashing', async () => {
  const cwd = await prepareRepo('quick', { gherkin: { featurePath: '../outside' } });
  try {
    const config = parseSimpleYaml(await fs.readFile(path.join(cwd, 'qa-ai.config.yaml'), 'utf8'));
    assert.throws(
      () => resolveConfigHarnessPath(cwd, config, '$config.gherkin.featurePath', 'features', 'feature root'),
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
    await fs.writeFile(path.join(cwd, 'qa-ai-output', 'requirement-analysis.md'), '# new\n', 'utf8');
    const result = await checkPhase(cwd);
    assert.equal(result.ok, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('unchanged pre-existing output does not require modification approval', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, 'qa-ai-output', 'requirement-analysis.md');
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
  const featureRel = 'features/RF-42-TC-001-existing.feature';
  try {
    await writeValidGherkinFeature(cwd, featureRel);
    await startRun(cwd);
    await nextPhase(cwd);
    await fs.writeFile(path.join(cwd, 'qa-ai-output', 'requirement-analysis.md'), '# intake\n', 'utf8');
    await checkPhase(cwd);
    await nextPhase(cwd);
    await fs.writeFile(path.join(cwd, 'qa-ai-output', 'normalized-requirements.md'), '# normalize\n', 'utf8');
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
    const outputPath = path.join(cwd, 'qa-ai-output', 'requirement-analysis.md');
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
    const outputPath = path.join(cwd, 'qa-ai-output', 'requirement-analysis.md');
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
    const outputPath = path.join(cwd, 'qa-ai-output', 'requirement-analysis.md');
    await fs.writeFile(outputPath, '# v1\n', 'utf8');
    await startRun(cwd);
    await nextPhase(cwd);
    const baseline = await getActiveRunSnapshot(cwd);

    await fs.writeFile(outputPath, '# v2\n', 'utf8');
    const status = await getRunStatus(cwd);
    assert.ok(status.blockers?.some((item) => item.type === 'modification'));

    const afterStatus = await getActiveRunSnapshot(cwd);
    assert.deepEqual(afterStatus.phases.intake.baselineOutputs, baseline.phases.intake.baselineOutputs);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('repeated next reports modification blocker when pre-existing output changed', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const outputPath = path.join(cwd, 'qa-ai-output', 'requirement-analysis.md');
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
    const controllerUrl = new URL('./lib/harness-controller.mjs', import.meta.url).href;
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
    const outputPath = path.join(cwd, 'qa-ai-output', 'requirement-analysis.md');
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

    await fs.writeFile(path.join(cwd, 'features', 'bad.feature'), 'Feature: invalid\n', 'utf8');
    await checkPhase(cwd, { maxAttempts: 2 });
    assert.equal((await checkPhase(cwd)).blocked, true);

    await retryPhase(cwd);
    await writeValidGherkinFeature(cwd);
    await fs.rm(path.join(cwd, 'features', 'bad.feature'), { force: true });
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

test('approval note with secrets is rejected', () => {
  assert.throws(() => assertNoteHasNoSecrets('token: ghp_abcdefghijklmnopqrstuvwxyz1234567890abcd'), /secret/i);
});

test('validator allowlist and redaction', () => {
  assert.equal(isValidatorAllowed('validate-features'), true);
  assert.equal(isValidatorAllowed('rm -rf /'), false);
  const redacted = redactDiagnostics('api_key: supersecretvalue123456');
  assert.ok(!redacted.includes('supersecretvalue123456') || redacted.includes('[REDACTED]'));
});

test('atomic write and exclusive lock', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-lock-'));
  try {
    const filePath = path.join(cwd, 'state.json');
    await atomicWriteJson(filePath, { version: 1 });
    const content = JSON.parse(await fs.readFile(filePath, 'utf8'));
    assert.equal(content.version, 1);

    await fs.mkdir(path.join(cwd, '.qa-ai', 'state', 'runs', 'run-1'), { recursive: true });
    const result = await withRunLock(cwd, 'run-1', async () => 'locked');
    assert.equal(result, 'locked');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('concurrent mutations serialize on run lock', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const snapshot = await startRun(cwd);
    const order = [];
    const first = withRunLock(cwd, snapshot.runId, async () => {
      order.push('start1');
      await sleep(120);
      order.push('end1');
      return 'first';
    });
    await sleep(20);
    const second = withRunLock(cwd, snapshot.runId, async () => {
      order.push('start2');
      order.push('end2');
      return 'second';
    });
    await Promise.all([first, second]);
    assert.deepEqual(order, ['start1', 'end1', 'start2', 'end2']);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('doctor exits non-zero when workflow contract is invalid', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const contractPath = path.join(cwd, '.qa-ai', 'contracts', 'workflow.v1.json');
    await fs.writeFile(contractPath, '{"schemaVersion":1}\n', 'utf8');
    const result = spawnSync(node, [cli, 'doctor'], { cwd, encoding: 'utf8', shell: false });
    assert.notEqual(result.status, 0);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validate-workflow-contract --json prints parseable JSON only', async () => {
  const script = path.join(sourceRoot, '.qa-ai', 'scripts', 'validate-workflow-contract.mjs');
  const result = spawnSync(node, [script, '--json'], { cwd: sourceRoot, encoding: 'utf8', shell: false });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout.trim());
  assert.equal(parsed.ok, true);
  assert.equal(result.stdout.includes('Workflow contract'), false);
});

test('qa-help stays stateless without active run', async () => {
  const cwd = await prepareRepo('standard');
  try {
    const report = await inspectQaWorkflow(cwd);
    assert.equal(report.activeRun, null);
    assert.ok(report.recommendations.some((item) => item.command.includes('run start')));
    assert.ok(
      report.recommendations.some((item) => item.command.includes('/qa-full-flow') || item.title.includes('Next phase'))
    );
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('qa-help prioritizes active run', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await startRun(cwd);
    const report = await inspectQaWorkflow(cwd);
    assert.ok(report.activeRun);
    assert.ok(report.recommendations[0].command.includes('run next'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('CLI run start and status --json', async () => {
  const cwd = await prepareRepo('quick');
  try {
    const start = runCli(cwd, ['run', 'start', '--rf', 'RF-CLI']);
    assert.ok(start.stdout.includes('Started run') || start.stdout.includes('RF-CLI'));
    const status = runCli(cwd, ['run', 'status', '--json']);
    const parsed = JSON.parse(status.stdout);
    assert.equal(parsed.active, true);
    assert.equal(parsed.rfId, 'RF-CLI');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('skip condition evaluation for tools', async () => {
  const config = parseSimpleYaml(`version: 1
project:
  qaTrack: standard
tools:
  testManagement: none
`);
  assert.equal(evaluateSkipCondition(config, { field: 'tools.testManagement', notConfigured: true }), true);
});

clearContractCache();
