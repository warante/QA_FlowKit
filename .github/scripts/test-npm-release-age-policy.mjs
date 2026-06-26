#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MIN_NPM_VERSION, parseNpmrc, semverGte, verifyNpmReleaseAgePolicy } from './lib/npm-release-age-policy.mjs';
import { verifyNpmReleaseAgePolicyFile } from './verify-npm-release-age-policy.mjs';

test('parseNpmrc ignores comments and reads min-release-age', () => {
  const values = parseNpmrc(`
# policy
min-release-age=2
`);
  assert.equal(values.get('min-release-age'), '2');
});

test('verifyNpmReleaseAgePolicy rejects missing or weak configuration', () => {
  const missing = verifyNpmReleaseAgePolicy({ npmrcContent: 'fund=false\n' });
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join('\n'), /min-release-age/);

  const weak = verifyNpmReleaseAgePolicy({ npmrcContent: 'min-release-age=1\n' });
  assert.equal(weak.ok, false);
});

test('verifyNpmReleaseAgePolicy accepts configured policy and npm version gate', () => {
  const ok = verifyNpmReleaseAgePolicy({
    npmrcContent: 'min-release-age=2\n',
    npmVersion: '11.11.0',
    checkNpmVersion: true
  });
  assert.equal(ok.ok, true);

  const oldNpm = verifyNpmReleaseAgePolicy({
    npmrcContent: 'min-release-age=2\n',
    npmVersion: '10.9.0',
    checkNpmVersion: true
  });
  assert.equal(oldNpm.ok, false);
  assert.match(oldNpm.errors.join('\n'), /11\.10\.0/);
});

test('semverGte compares npm versions', () => {
  assert.equal(semverGte('11.10.0', MIN_NPM_VERSION), true);
  assert.equal(semverGte('11.9.0', MIN_NPM_VERSION), false);
});

test('repository .npmrc satisfies the release-age policy', async () => {
  const result = await verifyNpmReleaseAgePolicyFile();
  assert.equal(result.ok, true, result.errors.join('\n'));
});
