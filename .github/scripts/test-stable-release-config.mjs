#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  configsMatchForStableMerge,
  isActiveStablePolicy,
  isPreparedStablePolicy
} from './lib/stable-release-config.mjs';
import { verifyStableReleaseConfig } from './verify-stable-release-config.mjs';

test('stable release config record is prepared while active policy remains beta', async () => {
  const result = await verifyStableReleaseConfig();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.status, 'prepared');
  assert.equal(result.activeMatchesStable, false);
});

test('stable policy helpers distinguish beta active from prepared stable file', () => {
  const active = { prerelease: true, 'prerelease-type': 'beta', packages: { '.': {} } };
  const prepared = { prerelease: false, packages: { '.': {} } };
  assert.equal(isActiveStablePolicy(active), false);
  assert.equal(isPreparedStablePolicy(prepared), true);
  assert.equal(configsMatchForStableMerge(active, prepared), false);
});
