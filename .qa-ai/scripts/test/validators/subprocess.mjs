#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { runValidatorScript, withTempWorkspace } from './_shared.mjs';

function asSpawnResult(result) {
  return { status: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

// --- validate-sync-plan (subprocess) ---

test('validate-sync-plan: --json passes for a covered proposal-first plan', async () => {
  await withTempWorkspace('qa-sync-plan-', async (tmp) => {
    await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'features', 'RF-001-TC-001-login.feature'),
      'Feature: Login\n  Scenario: works\n    Given a user\n    When they log in\n    Then ok\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(tmp, 'plan.md'),
      [
        '# Sync Plan',
        '',
        'Approval required before any external writes.',
        '',
        '| ID | Proposed action | Approval status |',
        '| --- | --------------- | --------------- |',
        '| RF-001, TC-001 | Plan to create | Pending approval |',
        ''
      ].join('\n'),
      'utf8'
    );
    const res = asSpawnResult(
      runValidatorScript('validate-sync-plan.mjs', tmp, ['--path', 'plan.md', '--features', 'features', '--json'])
    );
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  });
});

test('validate-sync-plan: --json fails when a feature identifier is missing from the plan', async () => {
  await withTempWorkspace('qa-sync-plan-bad-', async (tmp) => {
    await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'features', 'RF-001-TC-001-login.feature'),
      'Feature: Login\n  Scenario: works\n    Given a user\n    When they log in\n    Then ok\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(tmp, 'plan.md'),
      [
        '# Sync Plan',
        '',
        'Approval required before any external writes.',
        '',
        '| ID | Proposed action | Approval status |',
        '| --- | --------------- | --------------- |',
        '| RF-001 | Plan to create | Pending approval |',
        ''
      ].join('\n'),
      'utf8'
    );
    const res = asSpawnResult(
      runValidatorScript('validate-sync-plan.mjs', tmp, ['--path', 'plan.md', '--features', 'features', '--json'])
    );
    assert.equal(res.status, 1);
    const parsed = JSON.parse(res.stdout);
    assert.equal(parsed.ok, false);
    assert.ok(
      parsed.errors.some((e) => e.includes('TC-001')),
      parsed.errors.join('\n')
    );
  });
});

// --- validate-active-specialists (subprocess) ---

test('validate-active-specialists: --json --allow-missing succeeds without config', async () => {
  await withTempWorkspace('qa-active-spec-', async (tmp) => {
    const res = asSpawnResult(
      runValidatorScript('validate-active-specialists.mjs', tmp, ['--json', '--allow-missing'])
    );
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  });
});

test('validate-active-specialists: --json fails when config is missing', async () => {
  await withTempWorkspace('qa-active-spec-bad-', async (tmp) => {
    const res = asSpawnResult(runValidatorScript('validate-active-specialists.mjs', tmp, ['--json']));
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).ok, false);
  });
});

// --- validate-maestro-flows (subprocess) ---

test('validate-maestro-flows: --json skips when Maestro is not configured', async () => {
  await withTempWorkspace('qa-maestro-skip-', async (tmp) => {
    const res = asSpawnResult(runValidatorScript('validate-maestro-flows.mjs', tmp, ['--json']));
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  });
});

test('validate-maestro-flows: --json passes for a valid configured flow', async () => {
  await withTempWorkspace('qa-maestro-ok-', async (tmp) => {
    await fs.writeFile(
      path.join(tmp, 'qa-ai.config.yaml'),
      ['automation:', '  mobile:', '    framework: maestro', '    flowsPath: tests/maestro/flows', ''].join('\n'),
      'utf8'
    );
    await fs.mkdir(path.join(tmp, 'tests', 'maestro', 'flows'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'tests', 'maestro', 'flows', 'home.yaml'),
      ['appId: ${APP_ID}', '---', '- launchApp:', '    clearState: true', '- assertVisible: "Home"', ''].join('\n'),
      'utf8'
    );
    const res = asSpawnResult(runValidatorScript('validate-maestro-flows.mjs', tmp, ['--json']));
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  });
});

test('validate-maestro-flows: --json fails for an escaping subflow path', async () => {
  await withTempWorkspace('qa-maestro-bad-', async (tmp) => {
    await fs.writeFile(
      path.join(tmp, 'qa-ai.config.yaml'),
      ['automation:', '  mobile:', '    framework: maestro', '    flowsPath: tests/maestro/flows', ''].join('\n'),
      'utf8'
    );
    await fs.mkdir(path.join(tmp, 'tests', 'maestro', 'flows'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'tests', 'maestro', 'flows', 'home.yaml'),
      ['appId: ${APP_ID}', '---', '- runFlow: ../private.yaml', ''].join('\n'),
      'utf8'
    );
    const res = asSpawnResult(runValidatorScript('validate-maestro-flows.mjs', tmp, ['--json']));
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).ok, false);
  });
});
