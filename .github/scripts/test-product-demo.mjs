#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEMO_RF_ID, DEMO_WORKFLOW_PHASES } from './lib/product-demo.mjs';
import { verifyProductDemo } from './verify-product-demo.mjs';

test('product demo assets are static_ready with RF-101 fixtures', async () => {
  const result = await verifyProductDemo();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.status, 'static_ready');
});

test('demo workflow phases cover the quick track', () => {
  assert.equal(DEMO_RF_ID, 'RF-101');
  assert.deepEqual(DEMO_WORKFLOW_PHASES, ['intake', 'normalize', 'gherkin', 'traceability', 'pr']);
});
