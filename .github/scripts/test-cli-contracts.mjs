#!/usr/bin/env node
import assert from 'node:assert/strict';
import { repoRoot } from './lib/ci-helpers.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { parsePureJsonStdout } from '../../.qa-ai/scripts/lib/cli-contract.mjs';
import { collectLegacyConfigSignals } from '../../.qa-ai/scripts/lib/config-legacy.mjs';
import { parseSimpleYaml } from '../../.qa-ai/scripts/lib/utils.mjs';
import { verifyCliContracts } from './verify-cli-contracts.mjs';

test('parsePureJsonStdout rejects human-readable prefixes', () => {
  assert.throws(() => parsePureJsonStdout('QA FlowKit config validator\n{"ok":true}', 'test'), /not pure JSON/);
  assert.deepEqual(parsePureJsonStdout('{"ok":true}\n', 'test'), { ok: true });
});

test('cli-contracts inventory aligns with public JSON output list', async () => {
  const contracts = JSON.parse(
    await fs.readFile(path.join(repoRoot, '.qa-ai/contracts/cli-contracts.v1.json'), 'utf8')
  );
  const inventory = JSON.parse(
    await fs.readFile(path.join(repoRoot, '.qa-ai/contracts/public-contracts.v1.json'), 'utf8')
  );
  const stableJson = inventory.cli?.jsonOutputs?.stable || [];
  assert.ok(stableJson.includes('help --json'));
  assert.ok(stableJson.includes('run status --json'));
  assert.ok(contracts.scenarios.some((scenario) => scenario.command?.includes('--json')));
});

test('legacy config keys are detected from raw YAML', () => {
  const config = parseSimpleYaml(`
version: 1
requirements:
  allowInferredAcceptanceCriteria: true
`);
  assert.deepEqual(collectLegacyConfigSignals(config), ['requirements.allowInferredAcceptanceCriteria']);
});

test('golden CLI contract scenarios pass', async () => {
  const result = await verifyCliContracts({ root: repoRoot });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.ok(result.checked >= 8);
});
