#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertStableVersion, expectedDistTagForStableVersion, isStableVersion } from './lib/stable-version.mjs';
import { verifyStablePostPublishStatus } from './verify-stable-post-publish-status.mjs';

test('isStableVersion accepts stable semver only', () => {
  assert.equal(isStableVersion('1.0.0'), true);
  assert.equal(isStableVersion('1.0.0-rc.1'), false);
  assert.equal(isStableVersion('0.5.8-beta.0'), false);
});

test('expectedDistTagForStableVersion maps 1.0.0 to latest', () => {
  assert.equal(expectedDistTagForStableVersion('1.0.0'), 'latest');
});

test('assertStableVersion throws for prerelease semver', () => {
  assert.throws(() => assertStableVersion('1.0.0-rc.1'), /stable semver/);
});

test('stable post-publish status record is awaiting publish', async () => {
  const result = await verifyStablePostPublishStatus();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.status, 'awaiting_publish');
});
