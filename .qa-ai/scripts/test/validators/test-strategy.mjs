import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  strategyTables,
  reviewStrategySections,
  buildCapabilityIndex,
  summarizeTestObservations
} from '../../lib/test-strategy-analysis.mjs';
import { collectTestStrategy, collectMaintenance } from '../../lib/test-strategy-report.mjs';
import { withTempWorkspace, repoRoot } from './_shared.mjs';

const table = (heading, values) => {
  const keys = Object.keys(values);
  return `## ${heading}\n\n| ${keys.join(' | ')} |\n| ${keys.map(() => '---').join(' | ')} |\n| ${Object.values(values).join(' | ')} |\n`;
};
const outcome = {
  'Test ID': 'TC-001',
  'Criterion IDs': 'CR-RF-101-01',
  'Observable outcome': 'Rejected with no charge',
  'Observation source': 'ledger',
  Oracle: 'terminal rejection for request',
  'Input partition': 'below limit',
  'Output partition': 'rejected',
  'Counter-example': 'valid request succeeds',
  Asynchronous: 'yes',
  'Prohibited effect': 'yes',
  'Alternative behavior': 'rejected',
  Correlation: 'request ID',
  'Observation window': 'approved 5 s',
  'Terminal state': 'ledger terminal rejection'
};
const contrast = {
  'Criterion ID': 'CR-RF-101-01',
  Example: 'valid',
  'Counter-example': 'invalid',
  Question: 'What happens next?',
  'Decision owner': 'product owner',
  Decision: 'reject',
  Status: 'resolved'
};
const benefit = {
  RF: 'RF-101',
  'User segment': 'operators',
  'Behavior change': 'less rework',
  Baseline: '10 min',
  Target: '5 min',
  'Observation method': 'approved pilot',
  Control: 'influenced',
  Approval: 'approved',
  Status: 'proposed'
};
const feature = (rf, id, name = 'Submit request') =>
  `@rf:${rf}\nFeature: ${name}\n  Acceptance Criteria: approved\n\n  @id:${id}\n  Scenario: Rejection\n    Given a request below the limit\n    When it is submitted\n    Then it is rejected\n`;

test('strategy optional enrichment is advisory and absent sections preserve legacy behavior', () => {
  assert.deepEqual(reviewStrategySections().findings, []);
  const review = reviewStrategySections({ proposal: '## Proposed tests\nLegacy proposal without enrichment' });
  assert.equal(review.mode, 'advisory');
  assert.equal(review.semanticCorrectnessVerified, false);
  assert.deepEqual(review.findings, []);
});

test('strategy tables ignore fenced examples, support CRLF and preserve separate tables', () => {
  const content = `\`\`\`md\n${table('Outcome checks', outcome)}\`\`\`\n~~~md\nignored\n~~~\n${table('Contrast cases', contrast)}\n${table('Benefit evaluation', benefit)}`;
  const parsed = strategyTables(content.replace(/\n/g, '\r\n'));
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].section, 'contrast cases');
  assert.equal(parsed[1].rows[0].values.rf, 'RF-101');
  assert.deepEqual(strategyTables('plain text'), []);
});

test('strategy empty optional table is allowed; malformed table is advisory', () => {
  assert.equal(reviewStrategySections({ proposal: '## Outcome checks\n| Test ID |\n| --- |' }).findings.length, 0);
  const review = reviewStrategySections({ proposal: '## Outcome checks\n| Test ID |\n| broken |\n| TC-001 | extra |' });
  assert.ok(review.findings.some((f) => f.code === 'STRATEGY_TABLE_SHAPE'));
});

test('contrast decisions cannot silently approve a ready criterion', () => {
  const normalized = `${table('Normalized Criteria', { 'Criterion ID': 'CR-RF-101-01', Status: 'ready' })}\n${table('Contrast cases', { ...contrast, Decision: 'pending', Status: 'open', 'Decision owner': '' })}`;
  const codes = reviewStrategySections({ normalized }).findings.map((f) => f.code);
  for (const code of ['STRATEGY_DETAILS_MISSING', 'STRATEGY_DECISION_OPEN', 'STRATEGY_READY_WITH_OPEN_QUESTION'])
    assert.ok(codes.includes(code));
  assert.deepEqual(reviewStrategySections({ normalized: table('Contrast cases', contrast) }).findings, []);
});

test('outcome-first checks report missing outputs and unsupported async absence, never semantic PASS', () => {
  assert.deepEqual(reviewStrategySections({ proposal: table('Outcome checks', outcome) }).findings, []);
  const review = reviewStrategySections({
    proposal: table('Outcome checks', {
      ...outcome,
      Oracle: 'unknown',
      'Output partition': '',
      Correlation: 'pending',
      'Terminal state': ''
    })
  });
  assert.ok(review.findings.some((f) => f.code === 'STRATEGY_ASYNC_ABSENCE_UNSUPPORTED'));
  assert.ok(review.findings.some((f) => f.fields.includes('output partition')));
  assert.equal(review.semanticCorrectnessVerified, false);
  const sync = reviewStrategySections({
    proposal: table('Outcome checks', { ...outcome, Asynchronous: 'no', Correlation: '' })
  });
  assert.ok(!sync.findings.some((f) => f.code === 'STRATEGY_ASYNC_ABSENCE_UNSUPPORTED'));
  assert.ok(
    reviewStrategySections({
      proposal: table('Outcome checks', { ...outcome, Asynchronous: 'unknown' })
    }).findings.some((f) => f.code === 'STRATEGY_ASYNC_CLASSIFICATION_MISSING')
  );
  const semanticallyWrong = reviewStrategySections({
    proposal: table('Outcome checks', { ...outcome, Oracle: 'Every rejected request must be charged' })
  });
  assert.equal(semanticallyWrong.findings.length, 0, 'Nonempty false claims cannot be verified structurally.');
  assert.equal(semanticallyWrong.semanticCorrectnessVerified, false);
});

test('benefit claims require baselines and approval; optional ACC/redesign details are checked structurally', () => {
  assert.deepEqual(reviewStrategySections({ system: table('Benefit evaluation', benefit) }).findings, []);
  const review = reviewStrategySections({
    system:
      table('Benefit evaluation', { ...benefit, Baseline: 'unknown', Approval: 'pending', Status: 'measured' }) +
      table('Capability coverage', { Capability: 'recover', Component: 'queue' }),
    feasibility: table('Automation redesign', { 'Test ID': 'TC-001', Purpose: 'recovery' })
  });
  assert.ok(review.findings.some((f) => f.code === 'STRATEGY_BENEFIT_UNSUPPORTED'));
  assert.ok(review.findings.some((f) => f.code === 'STRATEGY_TARGET_UNAPPROVED'));
  assert.ok(review.findings.some((f) => f.section === 'capability coverage'));
  assert.ok(review.findings.some((f) => f.section === 'automation redesign'));
});

test('capability index groups two RFs without collapsing tests, folders, conflicting versions or IDs', () => {
  const files = [
    { path: 'api/one.feature', content: feature('RF-101', 'TC-001') },
    { path: 'manual/two.feature', content: feature('RF-102', 'TC-002', ' submit request ') },
    { path: 'e2e/old.feature', content: feature('RF-103', 'TC-001', 'Submit request v1') }
  ];
  const index = buildCapabilityIndex(files);
  assert.equal(index.capabilities.length, 2);
  assert.equal(index.capabilities[0].tests.length, 2);
  assert.deepEqual(
    index.capabilities[0].tests.map((t) => t.rfs[0]),
    ['RF-101', 'RF-102']
  );
  assert.equal(index.semanticEquivalenceVerified, false);
  assert.ok(index.warnings.some((w) => w.code === 'STRATEGY_DUPLICATE_ID'));
  assert.equal(index.capabilities.flatMap((c) => c.tests).length, 3);
});

test('capability parser supports Spanish, Rule tag inheritance, outlines and ignores docstring fake tags', () => {
  const content =
    '# language: es\n@rf:RF-201\nCaracterística: Recuperación\n  @rf:RF-202\n  Regla: Rechazo\n    @id:TC-201\n    Esquema del escenario: Rechazar\n      Dado un dato\n      Cuando llega\n      Entonces se rechaza\n      """\n      @id:TC-FAKE\n      """\n      Ejemplos:\n      | x |\n      | 1 |\n';
  const index = buildCapabilityIndex([{ path: 'one.feature', content }]);
  assert.deepEqual(index.capabilities[0].tests[0].rfs, ['RF-201', 'RF-202']);
  assert.deepEqual(index.capabilities[0].tests[0].testIds, ['TC-201']);
  const bad = buildCapabilityIndex([
    { path: 'bad.feature', content: 'no feature' },
    { path: 'missing.feature', content: 'Feature: Missing\nScenario: No ID\n' }
  ]);
  assert.ok(bad.warnings.some((w) => w.code === 'STRATEGY_FEATURE_UNPARSED'));
  assert.ok(bad.warnings.some((w) => w.code === 'STRATEGY_TEST_ID_MISSING'));
});

test('observations require run identity, distinguish revisions, missing durations and mixed outcomes', () => {
  const records = [
    { testId: 'TC-001', runId: '1', status: 'passed', durationMs: 100, sourceRevision: 'a'.repeat(40) },
    { testId: 'TC-001', runId: '2', status: 'failed', durationMs: 200, sourceRevision: 'a'.repeat(40) },
    { testId: 'TC-002', runId: '3', status: 'skipped' }
  ];
  const result = summarizeTestObservations(records);
  assert.equal(result[0].mixedOutcomesAtSameRevision, true);
  assert.equal(result[0].medianDurationMs, 150);
  assert.equal(result[0].classification, 'requires-review');
  assert.equal(result[1].medianDurationMs, null);
  assert.equal(result[1].skipped, 1);
  assert.equal(summarizeTestObservations(records.slice(0, 1))[0].medianDurationMs, 100);
  assert.equal(
    summarizeTestObservations([{ ...records[0] }, { ...records[1], sourceRevision: 'b'.repeat(40) }])[0]
      .mixedOutcomesAtSameRevision,
    false
  );
  assert.deepEqual(summarizeTestObservations(), []);
  for (const invalid of [
    null,
    {},
    Array(10001).fill({}),
    [null],
    [{ ...records[0], durationMs: -1 }],
    [{ ...records[0], sourceRevision: 'secret' }],
    [{ ...records[0], testId: 123 }],
    [{ ...records[0], runId: 123 }],
    [{ ...records[0], sourceRevision: 1234567 }],
    [{ ...records[0], status: 'flaky' }],
    [records[0], records[0]]
  ]) {
    assert.throws(() => summarizeTestObservations(invalid));
  }
});

async function setup(tmp, config = '') {
  await fs.mkdir(path.join(tmp, '.qa-ai'), { recursive: true });
  await fs.writeFile(
    path.join(tmp, '.qa-ai/qa-ai.config.yaml'),
    config || 'project:\n  name: Strategy fixture\ngherkin:\n  featurePath: features\n'
  );
  await fs.mkdir(path.join(tmp, 'features'));
  await fs.writeFile(path.join(tmp, 'features/one.feature'), feature('RF-101', 'TC-001'));
}

test('strategy report respects custom paths, is read-only and preserves missing-input limitations', async () => {
  await withTempWorkspace('qa-strategy-', async (tmp) => {
    await setup(
      tmp,
      'gherkin:\n  featurePath: features\ntestDesign:\n  proposalPath: proposal.md\n  systemPath: system.md\ntraceability:\n  matrixPath: trace.md\n'
    );
    await fs.writeFile(path.join(tmp, 'proposal.md'), table('Outcome checks', outcome));
    await fs.writeFile(path.join(tmp, 'system.md'), table('Benefit evaluation', benefit));
    const before = await fs.readdir(tmp);
    const report = await collectTestStrategy(tmp);
    assert.equal(report.traceabilitySource, 'trace.md');
    assert.deepEqual(report.review.findings, []);
    assert.equal(report.maintenance, null);
    assert.equal(report.readOnly, true);
    assert.ok(report.missingArtifacts.includes('normalized'));
    assert.ok(report.limitations.some((l) => l.includes('not supplied')));
    assert.deepEqual(await fs.readdir(tmp), before);
    await fs.writeFile(
      path.join(tmp, 'results.json'),
      JSON.stringify([{ testId: 'TC-ORPHAN', runId: 'run1', status: 'passed' }])
    );
    const observed = await collectTestStrategy(tmp, { results: 'results.json', maintenance: true });
    assert.deepEqual(observed.unmatchedObservationIds, ['TC-ORPHAN']);
    assert.equal(observed.maintenance.available, false);
  });
});

test('strategy report refuses legacy, missing config, unsafe paths, oversized inputs and malformed results', async () => {
  await withTempWorkspace('qa-strategy-input-', async (tmp) => {
    await assert.rejects(collectTestStrategy(tmp), /modern/);
    await setup(tmp, 'gherkin:\n  featurePath: ../outside\n');
    await assert.rejects(collectTestStrategy(tmp), /inside/);
    await fs.writeFile(path.join(tmp, '.qa-ai/qa-ai.config.yaml'), 'gherkin:\n  featurePath: features\n');
    await fs.writeFile(path.join(tmp, 'bad.json'), '{');
    await assert.rejects(collectTestStrategy(tmp, { results: 'bad.json' }));
    await fs.writeFile(path.join(tmp, 'big.json'), ' '.repeat(2 * 1024 * 1024 + 1));
    await assert.rejects(collectTestStrategy(tmp, { results: 'big.json' }), /2 MiB/);
    await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), 'version: 1\n');
    await assert.rejects(collectTestStrategy(tmp), /migrate/);
  });
});

test('strategy report refuses external junctions and missing feature directories stay explicit', async () => {
  await withTempWorkspace('qa-strategy-links-', async (tmp) => {
    await withTempWorkspace('qa-strategy-outside-', async (outside) => {
      await setup(tmp);
      await fs.symlink(outside, path.join(tmp, 'features/linked'), process.platform === 'win32' ? 'junction' : 'dir');
      await assert.rejects(collectTestStrategy(tmp), /inside|linked/);
      await fs.unlink(path.join(tmp, 'features/linked'));
      await fs.writeFile(path.join(tmp, '.qa-ai/qa-ai.config.yaml'), 'gherkin:\n  featurePath: absent\n');
      const report = await collectTestStrategy(tmp);
      assert.deepEqual(report.navigation.capabilities, []);
    });
  });
});

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
test('maintenance follows renames, reports untracked files and does not infer cause or half-life', async () => {
  await withTempWorkspace('qa-strategy-git-', async (tmp) => {
    await setup(tmp);
    git(tmp, ['init', '-q']);
    git(tmp, ['config', 'user.name', 'Fixture']);
    git(tmp, ['config', 'user.email', 'fixture@example.com']);
    git(tmp, ['add', '.']);
    git(tmp, ['commit', '-qm', 'fixture']);
    git(tmp, ['mv', 'features/one.feature', 'features/renamed.feature']);
    git(tmp, ['commit', '-qm', 'rename fixture']);
    const before = git(tmp, ['status', '--porcelain']);
    const maintenance = await collectMaintenance(tmp, [
      { path: 'features/renamed.feature' },
      { path: 'features/untracked.feature' }
    ]);
    assert.equal(maintenance.available, true);
    assert.equal(maintenance.shallow, false);
    assert.equal(maintenance.files[0].changeCommits, 2);
    assert.equal(maintenance.files[1].changeCommits, null);
    assert.equal(maintenance.files[0].classification, 'requires-review');
    assert.equal(git(tmp, ['status', '--porcelain']), before);
    await fs.mkdir(path.join(tmp, 'child'));
    assert.equal((await collectMaintenance(path.join(tmp, 'child'), [])).available, false);
  });
});

test('maintenance marks shallow history, bounded file selection and literal Git pathspecs', async () => {
  await withTempWorkspace('qa-strategy-shallow-', async (tmp) => {
    await setup(tmp);
    git(tmp, ['init', '-q']);
    git(tmp, ['config', 'user.name', 'Fixture']);
    git(tmp, ['config', 'user.email', 'fixture@example.com']);
    await fs.writeFile(path.join(tmp, 'features/[special].feature'), feature('RF-102', 'TC-002'));
    git(tmp, ['add', '.']);
    git(tmp, ['commit', '-qm', 'fixture']);
    await fs.writeFile(path.join(tmp, '.git/shallow'), `${git(tmp, ['rev-parse', 'HEAD'])}\n`);
    const report = await collectMaintenance(tmp, [{ path: 'features/[special].feature' }]);
    assert.equal(report.files[0].changeCommits, 1);
    assert.ok(report.warnings.includes('MAINTENANCE_SHALLOW_HISTORY'));
    const capped = await collectMaintenance(
      tmp,
      Array.from({ length: 101 }, (_, n) => ({ path: `missing/${n}.feature` }))
    );
    assert.equal(capped.files.length, 100);
    assert.ok(capped.warnings.includes('MAINTENANCE_FILE_LIMIT'));
  });
});

test('strategy CLI help, invalid options, bounded redacted errors and JSON success', async () => {
  await withTempWorkspace('qa-strategy-cli-', async (tmp) => {
    const script = path.join(repoRoot, '.qa-ai/scripts/analyze-test-strategy.mjs');
    const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: tmp, encoding: 'utf8' });
    assert.equal(run(['--help']).status, 0);
    assert.equal(run(['--bad']).status, 1);
    assert.equal(run(['--results']).status, 1);
    assert.equal(run(['--json=false']).status, 1);
    assert.equal(JSON.parse(run(['--json']).stderr).code, 'STRATEGY_ANALYSIS_INPUT_ERROR');
    await setup(tmp);
    const success = run(['--json']);
    assert.equal(success.status, 0, success.stderr);
    assert.equal(JSON.parse(success.stdout).kind, 'advisory-test-strategy');
    assert.match(run([]).stdout, /advisory/);
  });
});
