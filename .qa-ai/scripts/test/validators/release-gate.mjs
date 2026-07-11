#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectQaWorkflow, validateReleaseGateData, parseMarkdownTable } from './_fixtures.mjs';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';
import { copyFramework } from '../lib/integration-helpers.mjs';

// --- release gate ---

test('validateReleaseGateData: accepts PASS decision', () => {
  const result = validateReleaseGateData({
    decision: 'PASS',
    approver: 'QA Lead',
    coverage_summary: 'All validators passed.',
    open_risks: ['None documented'],
    evidence_paths: ['.qa-ai/output/traceability-matrix.md', '.qa-ai/output/pr-summary.md']
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.decision, 'PASS');
});

test('validateReleaseGateData: PENDING is invalid by default but accepted with allowPending', () => {
  const draft = {
    decision: 'PENDING',
    coverage_summary: 'Draft review in progress.',
    open_risks: ['Pending QA lead review'],
    evidence_paths: ['.qa-ai/output/pr-summary.md']
  };
  assert.notEqual(validateReleaseGateData(draft).errors.length, 0);
  assert.deepEqual(validateReleaseGateData(draft, { allowPending: true }).errors, []);
});

test('validateReleaseGateData: WAIVED requires approver and waived_reason', () => {
  const result = validateReleaseGateData({
    decision: 'WAIVED',
    coverage_summary: 'Partial coverage accepted.',
    open_risks: ['Known gap in API tests'],
    evidence_paths: ['.qa-ai/output/pr-summary.md']
  });
  assert.ok(result.errors.some((e) => e.includes('approver')));
  assert.ok(result.errors.some((e) => e.includes('waived_reason')));
});

// --- qa-help / inspectQaWorkflow ---

test('inspectQaWorkflow: uninitialized repo recommends init', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-help-'));
  try {
    const report = await inspectQaWorkflow(tempDir);
    assert.equal(report.initialized, false);
    assert.ok(report.recommendations.some((item) => item.command.includes('init.mjs')));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('inspectQaWorkflow: quick track next phase is gherkin after requirements', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-help-'));
  try {
    await fs.mkdir(path.join(tempDir, '.qa-ai', 'output'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.qa-ai', 'qa-ai.config.yaml'),
      [
        'project:',
        '  qaTrack: quick',
        'knowledge:',
        '  enabled: false',
        'tools:',
        '  testManagement: none',
        '  issueTracker: none',
        'automation:',
        '  ui:',
        '    framework: none',
        '  api:',
        '    framework: none',
        'gherkin:',
        '  featurePath: .qa-ai/features',
        'traceability:',
        '  matrixPath: .qa-ai/output/traceability-matrix.md',
        ''
      ].join('\n'),
      'utf8'
    );
    await fs.writeFile(
      path.join(tempDir, '.qa-ai', 'output', 'requirement-analysis.md'),
      '# Requirement Analysis\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(tempDir, '.qa-ai', 'output', 'normalized-requirements.md'),
      '# Normalized Requirements\n',
      'utf8'
    );
    const report = await inspectQaWorkflow(tempDir);
    assert.equal(report.track, 'quick');
    assert.ok(!report.pendingPhaseIds.includes('tm-coverage'));
    assert.ok(!report.pendingPhaseIds.includes('feasibility'));
    assert.equal(report.pendingPhaseIds[0], 'gherkin');
    assert.ok(
      report.recommendations.some((item) => item.title.includes('Gherkin') || item.title.includes('Next phase'))
    );
    assert.ok(report.recommendations.some((item) => item.command === '/qa-full-flow'));
    assert.ok(report.recommendations.some((item) => item.command === '/qa-validate-features'));
    assert.ok(
      !report.recommendations.some((item) => item.command.includes('node .qa-ai/scripts/validate-features.mjs'))
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('inspectQaWorkflow: standard track recommends /qa-status for aggregated validation', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-help-'));
  try {
    await copyFramework(tempDir);
    const outputDir = path.join(tempDir, '.qa-ai', 'output');
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(path.join(tempDir, '.qa-ai', 'features'), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, '.qa-ai', 'features', 'RF-001-sample.feature'),
      '@priority:high @type:smoke @manual:true @rf:RF-001\nFeature: Sample\n  Acceptance Criteria:\n    Given x\n',
      'utf8'
    );
    for (const name of [
      'requirement-analysis.md',
      'normalized-requirements.md',
      'test-design-system.md',
      'test-design-proposal.md'
    ]) {
      await fs.writeFile(path.join(outputDir, name), `# ${name}\n`, 'utf8');
    }
    await fs.writeFile(
      path.join(tempDir, '.qa-ai', 'qa-ai.config.yaml'),
      [
        'project:',
        '  qaTrack: standard',
        'knowledge:',
        '  enabled: false',
        'tools:',
        '  testManagement: none',
        '  issueTracker: none',
        'sources:',
        '  external:',
        '    enabled: false',
        'automation:',
        '  ui:',
        '    framework: none',
        '  api:',
        '    framework: none',
        'gherkin:',
        '  featurePath: .qa-ai/features',
        'testDesign:',
        '  systemPath: .qa-ai/output/test-design-system.md',
        '  proposalPath: .qa-ai/output/test-design-proposal.md',
        '  quality:',
        '    mode: off',
        'traceability:',
        '  matrixPath: .qa-ai/output/traceability-matrix.md',
        ''
      ].join('\n'),
      'utf8'
    );
    const report = await inspectQaWorkflow(tempDir);
    assert.equal(report.pendingPhaseIds[0], 'traceability');
    assert.ok(report.recommendations.some((item) => item.command === '/qa-status'));
    assert.ok(!report.recommendations.some((item) => item.command.includes('node .qa-ai/scripts/validate-target.mjs')));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

// --- parseMarkdownTable ---

test('parseMarkdownTable: valid table with required columns', () => {
  const result = parseMarkdownTable(
    [
      '| ID | Proposed action | Approval status |',
      '|---|---|---|',
      '| TC-001 | Propose create | Pending approval |',
      ''
    ].join('\n'),
    {
      label: 'Sync plan table',
      requiredColumns: ['ID', 'Proposed action', 'Approval status']
    }
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.header, ['ID', 'Proposed action', 'Approval status']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].values.id, 'TC-001');
  assert.equal(result.rows[0].values['proposed action'], 'Propose create');
  assert.equal(result.rows[0].values['approval status'], 'Pending approval');
});

test('parseMarkdownTable: missing separator row is an error', () => {
  const result = parseMarkdownTable(['| ID | Proposed action |', '| TC-001 | Propose create |', ''].join('\n'), {
    label: 'Sync plan table',
    requiredColumns: ['ID']
  });
  assertIncludes(result.errors, 'must have a Markdown separator row');
});

test('parseMarkdownTable: missing required column is an error', () => {
  const result = parseMarkdownTable(
    ['| ID | Proposed action |', '|---|---|', '| TC-001 | Propose create |', ''].join('\n'),
    {
      label: 'Sync plan table',
      requiredColumns: ['ID', 'Approval status']
    }
  );
  assertIncludes(result.errors, 'missing required column "Approval status"');
});

test('parseMarkdownTable: wrong cell count is an error', () => {
  const result = parseMarkdownTable(
    ['| ID | Proposed action |', '|---|---|', '| TC-001 | Propose create | Extra |', ''].join('\n'),
    {
      label: 'Sync plan table'
    }
  );
  assertIncludes(result.errors, 'row has 3 cell(s), expected 2');
});

test('parseMarkdownTable: empty row is an error', () => {
  const result = parseMarkdownTable(['| ID | Proposed action |', '|---|---|', '|  |  |', ''].join('\n'), {
    label: 'Sync plan table'
  });
  assertIncludes(result.errors, 'row is empty');
});
