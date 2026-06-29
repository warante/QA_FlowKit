#!/usr/bin/env node
import assert from 'node:assert/strict';
import { repoRoot } from './lib/ci-helpers.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { collectLegacyConfigSignals } from '../../.qa-ai/scripts/lib/config-legacy.mjs';
import { buildUpdatePlan, formatUpdatePlan, OLDEST_SUPPORTED_BETA } from '../../.qa-ai/scripts/lib/update-plan.mjs';

test('collectLegacyConfigSignals detects legacy requirement keys', () => {
  const keys = collectLegacyConfigSignals({
    requirements: {
      allowInferredAcceptanceCriteria: true,
      requireApprovalForInferredCriteria: true,
      inferredAcceptanceCriteria: 'require-approval'
    }
  });
  assert.deepEqual(keys, [
    'requirements.allowInferredAcceptanceCriteria',
    'requirements.requireApprovalForInferredCriteria'
  ]);
});

test('buildUpdatePlan reports preserved paths and legacy config keys', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-update-plan-'));
  try {
    const config = await fs.readFile(
      path.join(repoRoot, 'test/fixtures/migration/oldest-supported-beta/qa-ai.config.yaml'),
      'utf8'
    );
    await fs.mkdir(path.join(cwd, '.qa-ai', 'scripts', 'lib'), { recursive: true });
    await fs.cp(path.join(repoRoot, '.qa-ai'), path.join(cwd, '.qa-ai'), { recursive: true });
    await fs.writeFile(path.join(cwd, 'qa-ai.config.yaml'), config, 'utf8');
    await fs.writeFile(path.join(cwd, 'AGENTS.md'), '# marker\n', 'utf8');

    const plan = await buildUpdatePlan({ cwd, packageRoot: repoRoot });
    assert.equal(plan.oldestSupportedBeta, OLDEST_SUPPORTED_BETA);
    assert.ok(plan.legacyConfigKeys.length > 0);
    assert.ok(plan.preservedPaths.some((item) => item.includes('state')));
    assert.ok(plan.adaptersToSync.includes('generic') || plan.adaptersToSync.length >= 0);
    assert.match(formatUpdatePlan(plan), /dry run/i);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
