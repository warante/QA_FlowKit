#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRcVersion, assertRcVersion, expectedDistTagForVersion } from './lib/rc-version.mjs';

test('isRcVersion accepts 1.0.0-rc.N only', () => {
  assert.equal(isRcVersion('1.0.0-rc.1'), true);
  assert.equal(isRcVersion('1.0.0-rc.12'), true);
  assert.equal(isRcVersion('0.5.8-beta.0'), false);
  assert.equal(isRcVersion('1.0.0'), false);
});

test('expectedDistTagForVersion maps rc releases to rc tag', () => {
  assert.equal(expectedDistTagForVersion('1.0.0-rc.1'), 'rc');
  assert.equal(expectedDistTagForVersion('1.0.0'), 'latest');
});

test('assertRcVersion throws for non-rc semver', () => {
  assert.throws(() => assertRcVersion('0.5.8-beta.0'), /1\.0\.0-rc\.N/);
});
