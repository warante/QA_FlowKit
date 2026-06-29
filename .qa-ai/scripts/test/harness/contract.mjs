#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  validateWorkflowContract,
  validateWorkflowContractData
} from '../../lib/harness-contract.mjs';
import { BLOCKER_TYPES, renderBlocker } from '../../lib/harness-messages.mjs';
import { sourceRoot } from './_shared.mjs';

test('workflow contract validates in source repository', async () => {
  const result = await validateWorkflowContract(sourceRoot);
  assert.equal(result.ok, true, result.errors?.join('\n'));
});

test('renderBlocker covers all blocker types in English and Spanish', () => {
  const samples = {
    approval: { type: 'approval', gate: 'test-design', phaseName: 'Gherkin test design' },
    rf: { type: 'rf', phaseName: 'Gherkin test design' },
    validation: { type: 'validation', phaseName: 'Requirements intake' },
    modification: {
      type: 'modification',
      gate: 'modify-existing:intake',
      phaseName: 'Requirements intake',
      paths: ['qa-ai-output/requirement-analysis.md']
    },
    'missing-inputs': {
      type: 'missing-inputs',
      phaseName: 'Requirements normalization',
      missing: ['qa-ai-output/requirement-analysis.md']
    }
  };

  for (const type of BLOCKER_TYPES) {
    const en = renderBlocker(samples[type], 'en');
    const es = renderBlocker(samples[type], 'es');
    assert.ok(en.trim(), `${type} English message should not be empty`);
    assert.ok(es.trim(), `${type} Spanish message should not be empty`);
    assert.notEqual(en, es, `${type} messages should be localized`);
    assert.doesNotMatch(en, /\{|\}|\[[A-Z_]+\]|<[^>]+>/);
    assert.doesNotMatch(es, /\{|\}|\[[A-Z_]+\]|<[^>]+>/);
    assert.match(en, /npx qa-flowkit run/);
    assert.match(es, /npx qa-flowkit run/);
  }
});

test('contract rejects unknown validator and unsafe paths', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-bad-'));
  try {
    const bad = {
      schemaVersion: 1,
      trackOrder: { quick: ['intake'] },
      phases: [
        {
          id: 'intake',
          name: 'Intake',
          guidance: ['../outside.md'],
          inputs: [],
          outputs: [{ path: 'qa-ai-output/x.md' }],
          entryApprovals: [],
          validators: ['unknown-validator'],
          skipConditions: [],
          permissions: {
            createLocal: 'allowed',
            modifyExisting: 'approval',
            externalWrite: 'denied',
            delete: 'denied'
          }
        }
      ]
    };
    const errors = validateWorkflowContractData(cwd, bad);
    assert.ok(errors.some((item) => item.includes('unknown validator')));
    assert.ok(errors.some((item) => item.includes('traverse') || item.includes('outside')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});

test('contract permits externalWrite approval only for sync-apply', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-harness-permissions-'));
  try {
    const phase = {
      id: 'sync-diff',
      name: 'Sync diff',
      guidance: [],
      inputs: [],
      outputs: [],
      entryApprovals: [],
      validators: [],
      skipConditions: [],
      permissions: {
        createLocal: 'allowed',
        modifyExisting: 'approval',
        externalWrite: 'approval',
        delete: 'denied'
      }
    };
    const badNonApply = validateWorkflowContractData(cwd, {
      schemaVersion: 1,
      trackOrder: { standard: ['sync-diff'] },
      phases: [phase]
    });
    assert.ok(badNonApply.some((item) => item.includes('deny externalWrite')));

    const badApply = validateWorkflowContractData(cwd, {
      schemaVersion: 1,
      trackOrder: { standard: ['sync-apply'] },
      phases: [
        {
          ...phase,
          id: 'sync-apply',
          name: 'Sync apply',
          permissions: { ...phase.permissions, externalWrite: 'denied' }
        }
      ]
    });
    assert.ok(badApply.some((item) => item.includes('sync-apply permissions must declare externalWrite as approval')));
  } finally {
    await fs.rm(cwd, { recursive: true, force: true });
  }
});
