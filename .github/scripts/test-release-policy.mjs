#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveNpmDistTag, simulateRegistryVisibilityCheck } from './lib/npm-dist-tag.mjs';
import { FIRST_RC_VERSION, firstRcReleaseAsArgs } from './run-release-please.mjs';
import { verifyReleasePolicy } from './verify-release-policy.mjs';

test('resolveNpmDistTag matches workflow semantics', () => {
  assert.equal(resolveNpmDistTag('0.5.8-beta.0'), 'beta');
  assert.equal(resolveNpmDistTag('1.0.0-rc.1'), 'rc');
  assert.equal(resolveNpmDistTag('1.0.0'), 'latest');
  assert.equal(resolveNpmDistTag('1.0.0', { override: 'rc' }), 'rc');
});

test('simulateRegistryVisibilityCheck models post-publish retries', () => {
  const success = simulateRegistryVisibilityCheck(['', '1.0.0-rc.1'], '1.0.0-rc.1');
  assert.equal(success.ok, true);
  assert.equal(success.attempts, 2);

  const failure = simulateRegistryVisibilityCheck(['', ''], '1.0.0');
  assert.equal(failure.ok, false);
});

test('prepared release-please configs satisfy RC and stable policy', async () => {
  const result = await verifyReleasePolicy();
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('release-please wrapper bridges first beta to rc release', () => {
  const rcPolicy = {
    prerelease: true,
    'prerelease-type': 'rc',
    versioning: 'prerelease'
  };
  assert.deepEqual(firstRcReleaseAsArgs(rcPolicy, '0.5.9-beta.0'), [`--release-as=${FIRST_RC_VERSION}`]);
  assert.deepEqual(firstRcReleaseAsArgs(rcPolicy, '1.0.0-rc.1'), []);
  assert.deepEqual(firstRcReleaseAsArgs({ ...rcPolicy, versioning: undefined }, '0.5.9-beta.0'), []);
  assert.deepEqual(firstRcReleaseAsArgs({ ...rcPolicy, prerelease: false }, '0.5.9-beta.0'), []);
});
