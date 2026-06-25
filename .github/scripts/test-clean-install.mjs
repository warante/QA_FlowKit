#!/usr/bin/env node
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PACK_INFRASTRUCTURE,
  STABLE_COMMAND_SCRIPTS,
  validatePackFileList
} from '../../.qa-ai/scripts/lib/npm-pack-allowlist.mjs';

test('validatePackFileList requires every stable command script', () => {
  const files = [...STABLE_COMMAND_SCRIPTS, ...PACK_INFRASTRUCTURE].map((filePath) => ({ path: filePath }));
  assert.equal(validatePackFileList(files), files.length);
});

test('validatePackFileList rejects forbidden repository paths', () => {
  const files = [...STABLE_COMMAND_SCRIPTS, ...PACK_INFRASTRUCTURE, 'tests/smoke.mjs'].map((filePath) => ({
    path: filePath
  }));
  assert.throws(() => validatePackFileList(files), /forbidden path: tests\/smoke.mjs/);
});

test('stable command inventory covers public contract commands', () => {
  const scriptPaths = new Set(STABLE_COMMAND_SCRIPTS);
  const commandToScript = {
    init: '.qa-ai/scripts/init.mjs',
    bootstrap: '.qa-ai/scripts/bootstrap-agent-adapters.mjs',
    config: '.qa-ai/scripts/config.mjs',
    doctor: '.qa-ai/scripts/doctor.mjs',
    clean: '.qa-ai/scripts/clean.mjs',
    help: '.qa-ai/scripts/qa-help.mjs',
    run: '.qa-ai/scripts/qa-run.mjs',
    metrics: '.qa-ai/scripts/qa-metrics.mjs',
    'export-report': '.qa-ai/scripts/export-report.mjs',
    'sync-adapters': '.qa-ai/scripts/sync-agent-adapters.mjs',
    'validate-config': '.qa-ai/scripts/validate-config.mjs',
    'validate-untrusted-content': '.qa-ai/scripts/validate-untrusted-content.mjs',
    'validate-external-intake': '.qa-ai/scripts/validate-external-intake.mjs',
    'validate-target': '.qa-ai/scripts/validate-target.mjs',
    'validate-features': '.qa-ai/scripts/validate-features.mjs',
    'validate-karate-features': '.qa-ai/scripts/validate-karate-features.mjs',
    'validate-maestro-flows': '.qa-ai/scripts/validate-maestro-flows.mjs',
    'validate-traceability': '.qa-ai/scripts/validate-traceability.mjs',
    'validate-sync-plan': '.qa-ai/scripts/validate-sync-plan.mjs',
    'validate-sync-diff': '.qa-ai/scripts/validate-sync-diff.mjs',
    'validate-sync-result': '.qa-ai/scripts/validate-sync-result.mjs',
    'validate-active-specialists': '.qa-ai/scripts/validate-active-specialists.mjs',
    'validate-release-gate': '.qa-ai/scripts/validate-release-gate.mjs',
    'validate-test-design': '.qa-ai/scripts/validate-test-design.mjs',
    'validate-test-coverage': '.qa-ai/scripts/validate-test-coverage.mjs',
    'validate-quality-report': '.qa-ai/scripts/validate-quality-report.mjs'
  };
  for (const [command, relPath] of Object.entries(commandToScript)) {
    assert.ok(scriptPaths.has(relPath), `missing stable command script for ${command}`);
  }
  assert.ok(scriptPaths.has('bin/qa-flowkit.mjs'), 'missing CLI entrypoint');
});
