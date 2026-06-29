#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  assertNoteHasNoSecrets,
  isValidatorAllowed,
  redactDiagnostics,
  runPhaseValidators
} from '../../lib/harness-validation.mjs';
import { approveGate, checkPhase, setRfId, startRun } from '../../lib/harness-controller.mjs';
import { advanceToPhase, node, prepareRepo, writeCustomValidator, writeValidGherkinFeature } from './_shared.mjs';

test('approval note with secrets is rejected', () => {
  assert.throws(() => assertNoteHasNoSecrets('token: ghp_abcdefghijklmnopqrstuvwxyz1234567890abcd'), /secret/i);
});

test('validator allowlist and redaction', () => {
  assert.equal(isValidatorAllowed('validate-features'), true);
  assert.equal(isValidatorAllowed('rm -rf /'), false);
  const redacted = redactDiagnostics('api_key: supersecretvalue123456');
  assert.ok(!redacted.includes('supersecretvalue123456') || redacted.includes('[REDACTED]'));
});

test('phase validators run custom validators and keep non-blocking failures advisory', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await writeCustomValidator(cwd, { exitCode: 1, ok: false });
    const config = {
      validators: {
        custom: [
          {
            id: 'custom-warning',
            script: 'qa-custom/validate-custom.mjs',
            phases: ['gherkin'],
            blocking: false
          }
        ]
      }
    };
    const result = await runPhaseValidators(cwd, config, { id: 'gherkin', validators: [] });
    assert.equal(result.ok, true);
    assert.equal(result.results.length, 1);
    assert.equal(result.results[0].custom, true);
    assert.equal(result.results[0].ok, false);
    assert.equal(result.results[0].findings[0].severity, 'warning');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('checkPhase records warning events for non-blocking custom validator failures', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await writeCustomValidator(cwd, { exitCode: 1, ok: false });
    await fs.appendFile(
      path.join(cwd, 'qa-ai.config.yaml'),
      [
        'validators:',
        '  custom:',
        '    - id: custom-warning',
        '      script: qa-custom/validate-custom.mjs',
        '      phases:',
        '        - gherkin',
        '      blocking: false',
        ''
      ].join('\n'),
      'utf8'
    );

    const snapshot = await startRun(cwd);
    await advanceToPhase(cwd, 'normalize');
    await setRfId(cwd, 'RF-9');
    await approveGate(cwd, 'test-design');
    await advanceToPhase(cwd, 'gherkin');
    await writeValidGherkinFeature(cwd);

    const result = await checkPhase(cwd);
    assert.equal(result.ok, true);

    const eventsPath = path.join(cwd, '.qa-ai', 'state', 'runs', snapshot.runId, 'events.jsonl');
    const events = (await fs.readFile(eventsPath, 'utf8'))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    assert.ok(events.some((event) => event.type === 'phase.validation_warning' && event.phaseId === 'gherkin'));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('validate-target --json includes custom validator results', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await writeCustomValidator(cwd, { exitCode: 1, ok: false });
    await fs.appendFile(
      path.join(cwd, 'qa-ai.config.yaml'),
      [
        'validators:',
        '  custom:',
        '    - id: custom-warning',
        '      script: qa-custom/validate-custom.mjs',
        '      phases:',
        '        - gherkin',
        '      blocking: false',
        ''
      ].join('\n'),
      'utf8'
    );

    const result = spawnSync(
      node,
      [
        '.qa-ai/scripts/validate-target.mjs',
        '--json',
        '--allow-empty',
        '--allow-missing',
        '--no-strict-doctor',
        '--skip-test-design',
        '--skip-test-coverage',
        '--skip-quality-report',
        '--no-scan-secrets'
      ],
      { cwd, encoding: 'utf8', shell: false }
    );
    assert.notEqual(result.stdout.trim(), '', result.stderr);
    const parsed = JSON.parse(result.stdout);
    const custom = parsed.validators.find((validator) => validator.name === 'custom validator custom-warning');
    assert.equal(custom.status, 'warning');
    assert.equal(custom.custom, true);
    assert.equal(custom.blocking, false);
    assert.equal(custom.findings[0].severity, 'warning');
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('phase validators block on blocking custom validator failures', async () => {
  const cwd = await prepareRepo('quick');
  try {
    await writeCustomValidator(cwd, { exitCode: 1, ok: false });
    const config = {
      validators: {
        custom: [
          {
            id: 'custom-block',
            script: 'qa-custom/validate-custom.mjs',
            phases: ['gherkin'],
            blocking: true
          }
        ]
      }
    };
    const result = await runPhaseValidators(cwd, config, { id: 'gherkin', validators: [] });
    assert.equal(result.ok, false);
    assert.equal(result.results[0].blocking, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
