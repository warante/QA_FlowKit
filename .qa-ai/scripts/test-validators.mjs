#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseMarkdownTable } from './lib/markdown-table.mjs';
import { validateTestManagementMapping } from './lib/test-management-mapping.mjs';

function assertIncludes(haystack, needle) {
  assert.ok(
    haystack.some((item) => item.includes(needle)),
    `Expected an error containing: ${needle}\nActual errors:\n${haystack.join('\n')}`
  );
}

function testValidTable() {
  const result = parseMarkdownTable([
    '| ID | Proposed action | Approval status |',
    '|---|---|---|',
    '| TC-001 | Propose create | Pending approval |',
    ''
  ].join('\n'), {
    label: 'Sync plan table',
    requiredColumns: ['ID', 'Proposed action', 'Approval status']
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.header, ['ID', 'Proposed action', 'Approval status']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].values.id, 'TC-001');
  assert.equal(result.rows[0].values['proposed action'], 'Propose create');
  assert.equal(result.rows[0].values['approval status'], 'Pending approval');
}

function testMissingSeparator() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '| TC-001 | Propose create |',
    ''
  ].join('\n'), {
    label: 'Sync plan table',
    requiredColumns: ['ID']
  });

  assertIncludes(result.errors, 'must have a Markdown separator row');
}

function testMissingRequiredColumn() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '|---|---|',
    '| TC-001 | Propose create |',
    ''
  ].join('\n'), {
    label: 'Sync plan table',
    requiredColumns: ['ID', 'Approval status']
  });

  assertIncludes(result.errors, 'missing required column "Approval status"');
}

function testWrongCellCount() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '|---|---|',
    '| TC-001 | Propose create | Extra |',
    ''
  ].join('\n'), {
    label: 'Sync plan table'
  });

  assertIncludes(result.errors, 'row has 3 cell(s), expected 2');
}

function testEmptyRow() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '|---|---|',
    '|  |  |',
    ''
  ].join('\n'), {
    label: 'Sync plan table'
  });

  assertIncludes(result.errors, 'row is empty');
}

function testEmptyMappingIsValid() {
  assert.deepEqual(validateTestManagementMapping({}, { source: 'mapping.json' }), []);
}

function testValidMappingEntry() {
  const errors = validateTestManagementMapping({
    'TC-001': {
      externalId: 'C123',
      section: 'Login',
      suite: 'Regression',
      status: 'planned',
      lastReviewedAt: '2026-05-25',
      notes: 'Created from QA FlowKit proposal.'
    }
  }, { source: 'mapping.json' });

  assert.deepEqual(errors, []);
}

function testMappingEntryMustBeObject() {
  const errors = validateTestManagementMapping({
    'TC-001': 'C123'
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'entry "TC-001" must be an object');
}

function testMappingRejectsUnsupportedField() {
  const errors = validateTestManagementMapping({
    'TC-001': {
      externalId: 'C123',
      owner: 'qa'
    }
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'unsupported field "owner"');
}

function testMappingRejectsDuplicateExternalId() {
  const errors = validateTestManagementMapping({
    'TC-001': { externalId: 'C123' },
    'TC-002': { externalId: 'C123' }
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'externalId "C123" is used by both');
}

function testMappingRejectsSecretLikeFields() {
  const errors = validateTestManagementMapping({
    'TC-001': {
      externalId: 'C123',
      apiToken: 'github_pat_1234567890abcdefghijklmnop'
    }
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'unsupported field "apiToken"');
  assertIncludes(errors, 'appears to contain a secret');
}

async function testMappingTemplateIsValid() {
  const templatePath = path.resolve('.qa-ai/templates/test-management-mapping.template.json');
  const parsed = JSON.parse(await fs.readFile(templatePath, 'utf8'));
  assert.deepEqual(validateTestManagementMapping(parsed, { source: 'test-management-mapping.template.json' }), []);
}

async function main() {
  testValidTable();
  testMissingSeparator();
  testMissingRequiredColumn();
  testWrongCellCount();
  testEmptyRow();
  testEmptyMappingIsValid();
  testValidMappingEntry();
  testMappingEntryMustBeObject();
  testMappingRejectsUnsupportedField();
  testMappingRejectsDuplicateExternalId();
  testMappingRejectsSecretLikeFields();
  await testMappingTemplateIsValid();
  console.log('Validator unit tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
