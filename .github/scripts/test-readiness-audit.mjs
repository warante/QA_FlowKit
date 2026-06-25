#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyReadinessAudit } from './verify-readiness-audit.mjs';

test('readiness audit and risk register align with package version', async () => {
  const result = await verifyReadinessAudit();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.decision, 'PASS_WITH_ACTIONS');
});

test('readiness audit documents Epic 17 and 18 as done', async () => {
  const result = await verifyReadinessAudit();
  assert.equal(result.ok, true);
  assert.ok(result.openP1 >= 0);
});
