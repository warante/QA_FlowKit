#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { clearContractCache } from '../../lib/harness-contract.mjs';
import { node, sourceRoot } from './_shared.mjs';

test('validate-test-coverage CLI enforces source NFR coverage on nfr fixture', async () => {
  const fixtureRoot = path.join(sourceRoot, 'test', 'fixtures', 'nfr-coverage');
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-nfr-'));
  try {
    await fs.mkdir(path.join(cwd, 'qa-ai-output'), { recursive: true });
    await fs.copyFile(path.join(fixtureRoot, 'qa-ai.config.yaml'), path.join(cwd, 'qa-ai.config.yaml'));
    await fs.copyFile(
      path.join(fixtureRoot, 'normalized-requirements.md'),
      path.join(cwd, 'qa-ai-output', 'normalized-requirements.md')
    );
    await fs.copyFile(
      path.join(fixtureRoot, 'bad', 'test-design-proposal.md'),
      path.join(cwd, 'qa-ai-output', 'test-design-proposal.md')
    );
    const script = path.join(sourceRoot, '.qa-ai', 'scripts', 'validate-test-coverage.mjs');
    const bad = spawnSync(node, [script, '--allow-empty', '--mode', 'strict', '--json'], {
      cwd,
      encoding: 'utf8',
      shell: false
    });
    assert.notEqual(bad.status, 0);
    const badPayload = JSON.parse(bad.stdout);
    assert.ok((badPayload.errors || []).some((item) => String(item.rule || '').startsWith('nfr')));

    await fs.copyFile(
      path.join(fixtureRoot, 'good', 'test-design-proposal.md'),
      path.join(cwd, 'qa-ai-output', 'test-design-proposal.md')
    );
    const good = spawnSync(node, [script, '--allow-empty', '--mode', 'strict', '--json'], {
      cwd,
      encoding: 'utf8',
      shell: false
    });
    assert.equal(good.status, 0, good.stdout + good.stderr);
    assert.equal(JSON.parse(good.stdout).ok, true);
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

clearContractCache();
