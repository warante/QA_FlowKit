#!/usr/bin/env node
import assert from 'node:assert/strict';
import { repoRoot } from './lib/ci-helpers.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

const ADVERSARIAL_SCENARIOS = [
  'assertPathTraversalRejected',
  'assertSymlinkEscapeRejected',
  'assertSecretScanFailsWithoutLeakingValue',
  'assertMalformedContractFailsDoctor',
  'assertCorruptActiveStateDoesNotBreakHelp',
  'assertCleanDoesNotDeleteWithoutForceAndSkipsUnsafeManifestPath'
];

test('adversarial E2E runner covers documented failure paths', async () => {
  const runner = await fs.readFile(
    path.join(repoRoot, '.github/scripts/run-adversarial-failure-validation.mjs'),
    'utf8'
  );
  for (const scenario of ADVERSARIAL_SCENARIOS) {
    assert.ok(runner.includes(scenario), `missing adversarial scenario: ${scenario}`);
  }
});

test('threat model references adversarial validation', async () => {
  const threatModel = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/troubleshooting.md'), 'utf8');
  assert.ok(threatModel.includes('help --json` shows no active run after corrupt state'));
  assert.ok(threatModel.includes('symlink') || threatModel.includes('junction'));

  const model = await fs.readFile(path.join(repoRoot, 'docs/qa-ai/threat-model.md'), 'utf8');
  assert.ok(model.includes('npm run test:e2e-adversarial'));
});

test('package.json exposes adversarial E2E script', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(
    packageJson.scripts['test:e2e-adversarial'],
    'node .github/scripts/run-adversarial-failure-validation.mjs'
  );
});
