#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateTestManagementMapping } from './_fixtures.mjs';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';

// --- validateTestManagementMapping ---

test('validateTestManagementMapping: empty mapping is valid', () => {
  assert.deepEqual(validateTestManagementMapping({}, { source: 'mapping.json' }), []);
});

test('validateTestManagementMapping: valid entry with all fields', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': {
        externalId: 'C123',
        section: 'Login',
        suite: 'Regression',
        status: 'planned',
        lastReviewedAt: '2026-05-25',
        notes: 'Created from QA FlowKit proposal.'
      }
    },
    { source: 'mapping.json' }
  );
  assert.deepEqual(errors, []);
});

test('validateTestManagementMapping: entry must be an object', () => {
  const errors = validateTestManagementMapping({ 'TC-001': 'C123' }, { source: 'mapping.json' });
  assertIncludes(errors, 'entry "TC-001" must be an object');
});

test('validateTestManagementMapping: rejects unsupported field', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { externalId: 'C123', owner: 'qa' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'unsupported field "owner"');
});

test('validateTestManagementMapping: rejects duplicate externalId', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { externalId: 'C123' },
      'TC-002': { externalId: 'C123' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'externalId "C123" is used by both');
});

test('validateTestManagementMapping: rejects secret-like fields', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': {
        externalId: 'C123',
        apiToken: 'github_pat_1234567890abcdefghijklmnop'
      }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'unsupported field "apiToken"');
  assertIncludes(errors, 'appears to contain a secret');
});

test('validateTestManagementMapping: template file is valid', async () => {
  const templatePath = path.resolve('.qa-ai/templates/test-management-mapping.template.json');
  const parsed = JSON.parse(await fs.readFile(templatePath, 'utf8'));
  assert.deepEqual(validateTestManagementMapping(parsed, { source: 'test-management-mapping.template.json' }), []);
});

test('validateTestManagementMapping: accepts correct idempotencyKey, lastAppliedAt, and lastAppliedRunId', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': {
        externalId: 'C123',
        idempotencyKey: 'idemp-1234',
        lastAppliedAt: '2026-06-18T07:44:42Z',
        lastAppliedRunId: 'run-5678'
      }
    },
    { source: 'mapping.json' }
  );
  assert.deepEqual(errors, []);
});

test('validateTestManagementMapping: rejects duplicate idempotencyKey', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { idempotencyKey: 'idemp-1234' },
      'TC-002': { idempotencyKey: 'idemp-1234' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'idempotencyKey "idemp-1234" is used by both');
});

test('validateTestManagementMapping: rejects malformed lastAppliedAt', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { lastAppliedAt: '2026-06-18 07:44:42' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'field "lastAppliedAt" must be a valid ISO 8601 date string');
});
