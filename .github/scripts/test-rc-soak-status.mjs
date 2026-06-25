#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyRcSoakStatus } from './verify-rc-soak-status.mjs';

test('rc soak status record aligns with risk register and package version', async () => {
  const result = await verifyRcSoakStatus();
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('rc soak status starts in planned state until first RC publish', async () => {
  const result = await verifyRcSoakStatus();
  assert.equal(result.ok, true);
  assert.equal(result.status, 'planned');
});
