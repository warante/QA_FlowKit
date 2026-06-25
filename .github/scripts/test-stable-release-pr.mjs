#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STABLE_TARGET_VERSION, expectedReleasePrTitle, isStableReleaseVersion } from './lib/stable-release-pr.mjs';
import { verifyStableReleasePr } from './verify-stable-release-pr.mjs';

test('stable release PR record is awaiting release-please PR', async () => {
  const result = await verifyStableReleasePr();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.status, 'awaiting_release_pr');
});

test('stable release PR helpers recognize 1.0.0', () => {
  assert.equal(isStableReleaseVersion('1.0.0'), true);
  assert.equal(isStableReleaseVersion('1.0.0-rc.1'), false);
  assert.equal(expectedReleasePrTitle(), `chore: release ${STABLE_TARGET_VERSION}`);
});
