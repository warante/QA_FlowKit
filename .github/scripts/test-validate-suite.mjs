#!/usr/bin/env node
import assert from 'node:assert/strict';
import { repoRoot } from './lib/ci-helpers.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { stepLabel, VALIDATE_CORE_STEPS, VALIDATE_E2E_STEPS, VALIDATE_SUITES } from './lib/validate-suite-commands.mjs';

const legacyCommand = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts[
  'validate:oss-extraction'
];

test('validate suites partition legacy oss-extraction commands without overlap', () => {
  const coreLabels = new Set(VALIDATE_CORE_STEPS.map(stepLabel));
  const e2eLabels = new Set(VALIDATE_E2E_STEPS.map(stepLabel));
  const overlap = [...coreLabels].filter((label) => e2eLabels.has(label));
  assert.deepEqual(overlap, []);
  assert.equal(VALIDATE_SUITES.full.length, VALIDATE_CORE_STEPS.length + VALIDATE_E2E_STEPS.length);
});

test('legacy validate:oss-extraction delegates to the suite runner', () => {
  assert.match(legacyCommand, /run-validate-suite\.mjs full/);
});

test('validate:core and validate:e2e npm scripts exist', () => {
  const scripts = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts;
  assert.match(scripts['validate:core'], /run-validate-suite\.mjs core/);
  assert.match(scripts['validate:e2e'], /run-validate-suite\.mjs e2e/);
});
