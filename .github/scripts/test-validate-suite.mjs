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

test('validate:core includes agent-guidance coverage', () => {
  const coreLabels = VALIDATE_CORE_STEPS.map(stepLabel);
  const hasAgentGuidance = coreLabels.some((l) => l.includes('test:agent-guidance'));
  const hasValidator = coreLabels.some((l) => l.includes('validate-agent-guidance.mjs'));
  assert.ok(hasAgentGuidance, 'validate:core must include test:agent-guidance');
  assert.ok(hasValidator, 'validate:core must include validate-agent-guidance.mjs');
});

test('validate:core includes doctor guidance-integrity tests', () => {
  const coreLabels = VALIDATE_CORE_STEPS.map(stepLabel);
  const hasDoctorGuidanceTests = coreLabels.some((l) => l.includes('test:doctor-guidance-integrity'));
  assert.ok(hasDoctorGuidanceTests, 'validate:core must include test:doctor-guidance-integrity');
});
