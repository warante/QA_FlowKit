#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { validateSyncPlan } from '../../lib/sync-plan-validate.mjs';
import { withTempWorkspace } from './_shared.mjs';

test('validateSyncPlan (in-process): passes for a covered proposal-first plan', async () => {
  await withTempWorkspace('qa-sync-plan-api-', async (tmp) => {
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

    const result = await validateSyncPlan(tmp, { path: 'plan.md', features: 'features' });
    assert.equal(result.ok, true, result.errors?.join('\n'));
  });
});

test('validateSyncPlan (in-process): fails when a feature identifier is missing from the plan', async () => {
  await withTempWorkspace('qa-sync-plan-api-bad-', async (tmp) => {
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

    const result = await validateSyncPlan(tmp, { path: 'plan.md', features: 'features' });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes('TC-001')),
      result.errors.join('\n')
    );
  });
});
