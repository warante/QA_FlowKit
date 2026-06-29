#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateSkipCondition } from '../../lib/harness-contract.mjs';
import { startRun } from '../../lib/harness-controller.mjs';
import { inspectQaWorkflow } from '../../lib/qa-next-steps.mjs';
import { parseSimpleYaml } from '../../lib/utils.mjs';
import { cli, node, prepareRepo, runCli, sourceRoot } from './_shared.mjs';

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
