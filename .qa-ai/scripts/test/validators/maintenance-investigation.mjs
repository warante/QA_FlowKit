import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  buildCapabilityIndex,
  buildMaintenanceInvestigation,
  summarizeTestObservations
} from '../../lib/test-strategy-analysis.mjs';
import { collectTestStrategy } from '../../lib/test-strategy-report.mjs';
import { withTempWorkspace } from './_shared.mjs';

const index = (
  content = '@rf:RF-101\nFeature: Recovery\n@id:TC-001\nScenario: Reject\nGiven a request\nWhen rejected\nThen unchanged\n'
) => buildCapabilityIndex([{ path: 'features/one.feature', content }]);
const history = (overrides = {}) => ({
  available: true,
  shallow: false,
  files: [{ path: 'features/one.feature', changeCommits: 4, limited: false }],
  warnings: [],
  ...overrides
});
const observations = () =>
  summarizeTestObservations([
    { testId: 'TC-001', runId: 'r1', status: 'passed', durationMs: 10, sourceRevision: 'a'.repeat(40) },
    { testId: 'TC-001', runId: 'r2', status: 'failed', durationMs: 30, sourceRevision: 'a'.repeat(40) }
  ]);

test('maintenance investigation joins exact test IDs with file history and supplied run summaries, without causal claims', () => {
  const navigation = index();
  const runs = observations();
  const git = history();
  const before = JSON.stringify({ navigation, runs, git });
  const report = buildMaintenanceInvestigation(navigation, git, runs, { resultsSupplied: true });
  assert.equal(report.tests[0].observation.medianDurationMs, 20);
  assert.equal(report.tests[0].fileHistory[0].changeCommits, 4);
  assert.deepEqual(report.tests[0].signals, ['MIXED_OUTCOMES_SAME_SUPPLIED_REVISION']);
  assert.equal(report.causesInferred, false);
  assert.equal(report.automaticActions, false);
  assert.equal(report.tests[0].classification, 'requires-review');
  assert.deepEqual(report.capabilities[0].testIds, ['TC-001']);
  assert.equal(JSON.stringify({ navigation, runs, git }), before);
});

test('shared feature history is not summed into scenario or capability totals', () => {
  const navigation = index('Feature: Recovery\n@id:TC-001\nScenario: One\n@id:TC-002\nScenario: Two\n');
  const report = buildMaintenanceInvestigation(navigation, history(), [], { resultsSupplied: true });
  assert.equal(report.tests.length, 2);
  for (const row of report.tests) {
    assert.equal(row.fileHistory[0].changeCommits, 4);
    assert.equal(row.observation, null);
    assert.ok(row.signals.includes('EXECUTION_OBSERVATIONS_MISSING'));
  }
  assert.deepEqual(report.capabilities[0].paths, ['features/one.feature']);
  assert.equal(report.capabilities[0].changeCommits, undefined);
  assert.match(report.changeCountScope, /not-scenario-effort/);
});

test('duplicate test IDs in one file or across capabilities do not inherit run evidence', () => {
  for (const acrossFiles of [false, true]) {
    const navigation = acrossFiles
      ? buildCapabilityIndex([
          { path: 'features/one.feature', content: 'Feature: Recuperación\n@id:TC-001\nScenario: Uno\n' },
          { path: 'features/two.feature', content: 'Feature: Rejection\n@id:TC-001\nScenario: Two\n' }
        ])
      : index('Feature: Recovery\n@id:TC-001\nScenario: One\n@id:TC-001\nScenario: Two\n');
    const report = buildMaintenanceInvestigation(navigation, history(), observations(), { resultsSupplied: true });
    assert.equal(report.tests[0].identity, 'ambiguous');
    assert.equal(report.tests[0].observation, null);
    assert.ok(report.tests[0].signals.includes('TEST_ID_AMBIGUOUS'));
    assert.deepEqual(report.ambiguousObservationIds, ['TC-001']);
    assert.equal(report.tests[0].locations.length, 2);
    assert.equal(report.tests[0].fileHistory.length, acrossFiles ? 2 : 1);
  }
});

test('missing IDs and orphan execution records remain explicit, with no fuzzy ID matching', () => {
  const navigation = index('Feature: Recovery\nScenario: No ID\n');
  const report = buildMaintenanceInvestigation(navigation, null, observations(), { resultsSupplied: true });
  assert.equal(report.missingTestIds.length, 1);
  assert.equal(report.tests.length, 0);
  assert.deepEqual(report.unmatchedObservationIds, ['TC-001']);
  const other = buildMaintenanceInvestigation(index(), null, [{ ...observations()[0], testId: 'tc-001' }], {
    resultsSupplied: true
  });
  assert.deepEqual(other.unmatchedObservationIds, ['tc-001']);
  assert.equal(other.tests[0].observation, null);
});

test('disabled, unavailable and uncollected history remain unknown rather than zero maintenance', () => {
  for (const [input, state] of [
    [null, 'not-requested'],
    [history({ available: false, files: [], shallow: null }), 'unavailable'],
    [history({ files: [] }), 'not-collected'],
    [history({ files: [{ path: 'features/one.feature', changeCommits: null, limited: false }] }), 'unavailable']
  ]) {
    const report = buildMaintenanceInvestigation(index(), input, []);
    assert.equal(report.tests[0].fileHistory[0].state, state);
    assert.equal(report.tests[0].fileHistory[0].changeCommits, null);
    assert.ok(report.tests[0].signals.includes('EXECUTION_OBSERVATIONS_NOT_SUPPLIED'));
    assert.ok(report.tests[0].signals.includes(`MAINTENANCE_${state.toUpperCase().replaceAll('-', '_')}`));
  }
});

test('shallow and truncated history retain observed counts but expose their limits', () => {
  const report = buildMaintenanceInvestigation(
    index(),
    history({
      shallow: true,
      files: [{ path: 'features/one.feature', changeCommits: 100, limited: true }]
    }),
    []
  );
  assert.equal(report.tests[0].fileHistory[0].changeCommits, 100);
  assert.ok(report.tests[0].signals.includes('MAINTENANCE_SHALLOW_HISTORY'));
  assert.ok(report.tests[0].signals.includes('MAINTENANCE_TRUNCATED_HISTORY'));
});

test('different or missing revisions and skipped runs never become confirmed flakiness', () => {
  const runs = summarizeTestObservations([
    { testId: 'TC-001', runId: 'a', status: 'passed', sourceRevision: 'a'.repeat(40) },
    { testId: 'TC-001', runId: 'b', status: 'failed', sourceRevision: 'b'.repeat(40) },
    { testId: 'TC-001', runId: 'c', status: 'failed' },
    { testId: 'TC-001', runId: 'd', status: 'skipped', sourceRevision: 'a'.repeat(40) }
  ]);
  const report = buildMaintenanceInvestigation(index(), history(), runs, { resultsSupplied: true });
  assert.equal(report.tests[0].observation.mixedOutcomesAtSameRevision, false);
  assert.deepEqual(report.tests[0].signals, []);
  assert.equal(report.tests[0].observation.medianDurationMs, null);
  assert.equal(report.causesInferred, false);
});

test('investigation is deterministic and preserves Spanish capability names and canonical IDs', () => {
  const navigation = index(
    '# language: es\nCaracterística: Recuperación\n@id:TC-002\nEscenario: Dos\n@id:TC-001\nEscenario: Uno\n'
  );
  const report = buildMaintenanceInvestigation(navigation, history(), []);
  assert.deepEqual(report.capabilities[0].testIds, ['TC-001', 'TC-002']);
  assert.equal(report.capabilities[0].capability, 'Recuperación');
  assert.deepEqual(
    report.tests.map((row) => row.testId),
    ['TC-001', 'TC-002']
  );
  assert.deepEqual(buildMaintenanceInvestigation(navigation, history(), []), report);
});

test('integrated report links renamed Git paths to executions and leaves repository unchanged', async () => {
  await withTempWorkspace('qa-maintenance-join-', async (tmp) => {
    const git = (args) => execFileSync('git', args, { cwd: tmp, encoding: 'utf8', stdio: 'pipe' }).trim();
    await fs.mkdir(path.join(tmp, '.qa-ai'));
    await fs.mkdir(path.join(tmp, 'features'));
    await fs.writeFile(path.join(tmp, '.qa-ai/qa-ai.config.yaml'), 'gherkin:\n  featurePath: features\n');
    await fs.writeFile(path.join(tmp, 'features/one.feature'), 'Feature: Recovery\n@id:TC-001\nScenario: One\n');
    await fs.writeFile(
      path.join(tmp, 'runs.json'),
      JSON.stringify([{ testId: 'TC-001', runId: 'r1', status: 'passed', durationMs: 12 }])
    );
    git(['init', '-q']);
    git(['config', 'user.name', 'Fixture']);
    git(['config', 'user.email', 'fixture@example.com']);
    git(['add', '.']);
    git(['commit', '-qm', 'synthetic fixture']);
    git(['mv', 'features/one.feature', 'features/renamed.feature']);
    git(['commit', '-qm', 'synthetic rename']);
    const before = git(['status', '--porcelain']);
    const report = await collectTestStrategy(tmp, { maintenance: true, results: 'runs.json' });
    const row = report.investigation.tests[0];
    assert.equal(row.fileHistory[0].path, 'features/renamed.feature');
    assert.equal(row.fileHistory[0].changeCommits, 2);
    assert.equal(row.observation.passed, 1);
    assert.equal(row.observation.medianDurationMs, 12);
    assert.equal(git(['status', '--porcelain']), before);
    const withoutInputs = await collectTestStrategy(tmp);
    assert.equal(withoutInputs.investigation.tests[0].fileHistory[0].state, 'not-requested');
    assert.equal(withoutInputs.investigation.tests[0].observation, null);
  });
});
