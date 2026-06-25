#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANNOUNCEMENT_REQUIRED_SECTIONS } from './lib/stable-announcement.mjs';
import { verifyStableAnnouncement } from './verify-stable-announcement.mjs';

test('stable announcement assets are prepared while README remains beta', async () => {
  const result = await verifyStableAnnouncement();
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.status, 'prepared');
});

test('announcement template includes required sections', () => {
  const required = new Set(ANNOUNCEMENT_REQUIRED_SECTIONS);
  assert.ok(required.has('## Install'));
  assert.ok(required.has('## Feedback'));
});
