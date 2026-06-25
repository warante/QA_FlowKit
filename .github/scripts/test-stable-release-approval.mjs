#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyStableReleaseApproval } from './verify-stable-release-approval.mjs';

test('stable release approval record aligns with risk register and release policy', async () => {
  const result = await verifyStableReleaseApproval();
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('stable release approval stays pending until RC soak completes', async () => {
  const result = await verifyStableReleaseApproval();
  assert.equal(result.ok, true);
  assert.equal(result.status, 'pending');
  assert.equal(result.epic20Unblocked, false);
});
