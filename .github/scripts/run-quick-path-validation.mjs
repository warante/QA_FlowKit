#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { jsonOutput, repoRoot, runSourceCli } from './lib/ci-helpers.mjs';

const fixtureRoot = path.join(repoRoot, 'test', 'fixtures', 'quick-path');

async function copyFixture(relativeSource, targetRoot, relativeTarget = relativeSource) {
  const source = path.join(fixtureRoot, relativeSource);
  const target = path.join(targetRoot, relativeTarget);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

function assertPhase(packet, expected) {
  assert.equal(packet.phase?.id, expected, `Expected phase ${expected}, got ${packet.phase?.id || 'none'}`);
}

async function main() {
  const startedAt = Date.now();
  const target = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-flowkit-quick-path-'));

  try {
    runSourceCli(target, [
      'init',
      '--preset',
      'manual-only',
      '--qa-track',
      'quick',
      '--adapters',
      'generic',
      '--skip-doctor'
    ]);
    runSourceCli(target, ['doctor']);
    await copyFixture('requirements/RF-101-login.md', target);
    console.log('[PASS] clean quick-track target initialized');

    const started = jsonOutput(runSourceCli(target, ['run', 'start', '--rf', 'RF-101', '--json']), 'run start');
    assert.equal(started.track, 'quick');

    assertPhase(jsonOutput(runSourceCli(target, ['run', 'next', '--json']), 'intake next'), 'intake');
    await copyFixture('expected/qa-ai-output/requirement-analysis.md', target, 'qa-ai-output/requirement-analysis.md');
    assert.equal(jsonOutput(runSourceCli(target, ['run', 'check', '--json']), 'intake check').ok, true);

    assertPhase(jsonOutput(runSourceCli(target, ['run', 'next', '--json']), 'normalize next'), 'normalize');
    await copyFixture(
      'expected/qa-ai-output/normalized-requirements.md',
      target,
      'qa-ai-output/normalized-requirements.md'
    );
    assert.equal(jsonOutput(runSourceCli(target, ['run', 'check', '--json']), 'normalize check').ok, true);

    runSourceCli(target, ['run', 'approve', 'test-design', '--note', 'RF-101 quick-path design approved', '--json']);
    assertPhase(jsonOutput(runSourceCli(target, ['run', 'next', '--json']), 'gherkin next'), 'gherkin');
    await copyFixture('invalid/RF-101-TC-001-login.feature', target, 'features/functional/RF-101-TC-001-login.feature');

    const failedGherkin = jsonOutput(
      runSourceCli(target, ['run', 'check', '--json'], { expectFailure: true }),
      'intentional Gherkin failure'
    );
    assert.equal(failedGherkin.ok, false);
    assert.equal(failedGherkin.phaseId, 'gherkin');
    assert.match(JSON.stringify(failedGherkin), /manual/i);
    console.log('[PASS] intentional missing @manual tag was rejected');

    await copyFixture(
      'expected/features/functional/RF-101-TC-001-login.feature',
      target,
      'features/functional/RF-101-TC-001-login.feature'
    );
    assert.equal(jsonOutput(runSourceCli(target, ['run', 'check', '--json']), 'corrected Gherkin check').ok, true);
    console.log('[PASS] corrected Gherkin passed');

    assertPhase(jsonOutput(runSourceCli(target, ['run', 'next', '--json']), 'traceability next'), 'traceability');
    await copyFixture('expected/qa-ai-output/traceability-matrix.md', target, 'qa-ai-output/traceability-matrix.md');
    assert.equal(jsonOutput(runSourceCli(target, ['run', 'check', '--json']), 'traceability check').ok, true);

    assertPhase(jsonOutput(runSourceCli(target, ['run', 'next', '--json']), 'PR next'), 'pr');
    await copyFixture('expected/qa-ai-output/pr-summary.md', target, 'qa-ai-output/pr-summary.md');
    const finalCheck = jsonOutput(runSourceCli(target, ['run', 'check', '--json']), 'PR check');
    assert.equal(finalCheck.ok, true);
    assert.equal(finalCheck.status, 'completed');

    const status = jsonOutput(runSourceCli(target, ['run', 'status', '--json']), 'final status');
    assert.equal(status.status, 'completed');
    assert.ok(status.phases.every((phase) => ['completed', 'skipped'].includes(phase.status)));

    runSourceCli(target, ['validate-target']);
    assert.ok(Date.now() - startedAt < 300_000, 'Quick path exceeded five minutes');
    console.log('[PASS] completed run and strict target validation');
    console.log(`Quick path E2E passed in ${Date.now() - startedAt}ms.`);
  } finally {
    await fs.rm(target, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
