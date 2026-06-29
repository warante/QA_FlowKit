#!/usr/bin/env node
import assert from 'node:assert/strict';
import { repoRoot } from './lib/ci-helpers.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import {
  assertSupportedVersion,
  loadSchemaRegistry,
  unsupportedVersionMessage,
  validateConfigContract,
  validateInitManifestContract,
  validateRunStateContract,
  validateWorkflowContractSchema
} from '../../.qa-ai/scripts/lib/contract-schemas.mjs';
import { verifyCompatibilityFixtures } from './verify-compatibility-fixtures.mjs';


test('schema registry lists versioned contract surfaces', async () => {
  const registry = await loadSchemaRegistry(repoRoot);
  assert.equal(registry.schemaVersion, 1);
  for (const surface of ['config', 'workflow', 'run-state', 'run-event', 'init-manifest']) {
    assert.ok(registry.surfaces?.[surface]?.schemaPath, `missing surface ${surface}`);
    assert.deepEqual(registry.surfaces[surface].supportedVersions, [1]);
    await fs.access(path.join(repoRoot, registry.surfaces[surface].schemaPath));
  }
});

test('unsupported version messages point to the migration guide', () => {
  const message = unsupportedVersionMessage('config', 2, [1]);
  assert.match(message, /schema version 2 is unsupported/);
  assert.match(message, /docs\/qa-ai\/schema-compatibility\.md/);
  assert.equal(assertSupportedVersion('workflow', 1, [1]), null);
  assert.match(assertSupportedVersion('workflow', 9, [1]), /workflow schema version 9 is unsupported/);
});

test('oldest supported beta config normalizes legacy requirement keys', async () => {
  const content = await fs.readFile(
    path.join(repoRoot, 'test/fixtures/compatibility/config/oldest-supported-beta/qa-ai.config.yaml'),
    'utf8'
  );
  const { parseSimpleYaml } = await import('../../.qa-ai/scripts/lib/utils.mjs');
  const parsed = parseSimpleYaml(content);
  const result = await validateConfigContract(parsed, { normalizeLegacy: true, root: repoRoot });
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.equal(result.errors.length, 0);
});

test('shipped workflow contract matches workflow schema version 1', async () => {
  const workflow = JSON.parse(await fs.readFile(path.join(repoRoot, '.qa-ai/contracts/workflow.v1.json'), 'utf8'));
  const result = await validateWorkflowContractSchema(workflow, { root: repoRoot });
  assert.equal(result.ok, true, result.errors.join('; '));
});

test('current beta run-state fixture validates', async () => {
  const snapshot = JSON.parse(
    await fs.readFile(path.join(repoRoot, 'test/fixtures/compatibility/run-state/current-beta/run.json'), 'utf8')
  );
  const result = await validateRunStateContract(snapshot, { root: repoRoot });
  assert.equal(result.ok, true, result.errors.join('; '));
});

test('current beta init manifest fixture validates', async () => {
  const manifest = JSON.parse(
    await fs.readFile(
      path.join(repoRoot, 'test/fixtures/compatibility/init-manifest/current-beta/init-manifest.json'),
      'utf8'
    )
  );
  const result = await validateInitManifestContract(manifest, { root: repoRoot });
  assert.equal(result.ok, true, result.errors.join('; '));
});

test('compatibility manifest fixtures pass verification', async () => {
  const result = await verifyCompatibilityFixtures({ root: repoRoot });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.ok(result.checked >= 10);
});
