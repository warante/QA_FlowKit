#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { inspectQaWorkflow, normalizeQaTrack } from './lib/qa-next-steps.mjs';
import { validateReleaseGateData } from './lib/release-gate.mjs';
import { validateTestDesignProposal, validateTestDesignSystem } from './lib/test-design.mjs';
import { parseMarkdownTable } from './lib/markdown-table.mjs';
import { validateTestManagementMapping } from './lib/test-management-mapping.mjs';

function assertIncludes(haystack, needle) {
  assert.ok(
    haystack.some((item) => item.includes(needle)),
    `Expected an error containing: ${needle}\nActual errors:\n${haystack.join('\n')}`
  );
}

function testValidTable() {
  const result = parseMarkdownTable([
    '| ID | Proposed action | Approval status |',
    '|---|---|---|',
    '| TC-001 | Propose create | Pending approval |',
    ''
  ].join('\n'), {
    label: 'Sync plan table',
    requiredColumns: ['ID', 'Proposed action', 'Approval status']
  });

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.header, ['ID', 'Proposed action', 'Approval status']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].values.id, 'TC-001');
  assert.equal(result.rows[0].values['proposed action'], 'Propose create');
  assert.equal(result.rows[0].values['approval status'], 'Pending approval');
}

function testMissingSeparator() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '| TC-001 | Propose create |',
    ''
  ].join('\n'), {
    label: 'Sync plan table',
    requiredColumns: ['ID']
  });

  assertIncludes(result.errors, 'must have a Markdown separator row');
}

function testMissingRequiredColumn() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '|---|---|',
    '| TC-001 | Propose create |',
    ''
  ].join('\n'), {
    label: 'Sync plan table',
    requiredColumns: ['ID', 'Approval status']
  });

  assertIncludes(result.errors, 'missing required column "Approval status"');
}

function testWrongCellCount() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '|---|---|',
    '| TC-001 | Propose create | Extra |',
    ''
  ].join('\n'), {
    label: 'Sync plan table'
  });

  assertIncludes(result.errors, 'row has 3 cell(s), expected 2');
}

function testEmptyRow() {
  const result = parseMarkdownTable([
    '| ID | Proposed action |',
    '|---|---|',
    '|  |  |',
    ''
  ].join('\n'), {
    label: 'Sync plan table'
  });

  assertIncludes(result.errors, 'row is empty');
}

function testEmptyMappingIsValid() {
  assert.deepEqual(validateTestManagementMapping({}, { source: 'mapping.json' }), []);
}

function testValidMappingEntry() {
  const errors = validateTestManagementMapping({
    'TC-001': {
      externalId: 'C123',
      section: 'Login',
      suite: 'Regression',
      status: 'planned',
      lastReviewedAt: '2026-05-25',
      notes: 'Created from QA FlowKit proposal.'
    }
  }, { source: 'mapping.json' });

  assert.deepEqual(errors, []);
}

function testMappingEntryMustBeObject() {
  const errors = validateTestManagementMapping({
    'TC-001': 'C123'
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'entry "TC-001" must be an object');
}

function testMappingRejectsUnsupportedField() {
  const errors = validateTestManagementMapping({
    'TC-001': {
      externalId: 'C123',
      owner: 'qa'
    }
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'unsupported field "owner"');
}

function testMappingRejectsDuplicateExternalId() {
  const errors = validateTestManagementMapping({
    'TC-001': { externalId: 'C123' },
    'TC-002': { externalId: 'C123' }
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'externalId "C123" is used by both');
}

function testMappingRejectsSecretLikeFields() {
  const errors = validateTestManagementMapping({
    'TC-001': {
      externalId: 'C123',
      apiToken: 'github_pat_1234567890abcdefghijklmnop'
    }
  }, { source: 'mapping.json' });

  assertIncludes(errors, 'unsupported field "apiToken"');
  assertIncludes(errors, 'appears to contain a secret');
}

async function testMappingTemplateIsValid() {
  const templatePath = path.resolve('.qa-ai/templates/test-management-mapping.template.json');
  const parsed = JSON.parse(await fs.readFile(templatePath, 'utf8'));
  assert.deepEqual(validateTestManagementMapping(parsed, { source: 'test-management-mapping.template.json' }), []);
}

function testNormalizeQaTrack() {
  assert.equal(normalizeQaTrack('fast'), 'quick');
  assert.equal(normalizeQaTrack('enterprise'), 'enterprise');
  assert.equal(normalizeQaTrack('unknown-value'), 'standard');
}

async function testQaHelpWithoutConfig() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-help-'));
  const report = await inspectQaWorkflow(tempDir);
  assert.equal(report.initialized, false);
  assert.ok(report.recommendations.some((item) => item.command.includes('init.mjs')));
}

function testReleaseGatePass() {
  const result = validateReleaseGateData({
    decision: 'PASS',
    approver: 'QA Lead',
    coverage_summary: 'All validators passed.',
    open_risks: ['None documented'],
    evidence_paths: ['qa-ai-output/traceability-matrix.md', 'qa-ai-output/pr-summary.md']
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.decision, 'PASS');
}

function testReleaseGatePendingCanBeAllowed() {
  const draft = {
    decision: 'PENDING',
    coverage_summary: 'Draft review in progress.',
    open_risks: ['Pending QA lead review'],
    evidence_paths: ['qa-ai-output/pr-summary.md']
  };

  assert.notEqual(validateReleaseGateData(draft).errors.length, 0);
  assert.deepEqual(validateReleaseGateData(draft, { allowPending: true }).errors, []);
}

function testTestDesignSystemSections() {
  const valid = validateTestDesignSystem(`# System Test Design\n${[
    '## Scope',
    '## Architecture alignment',
    '## Testability risks',
    '## Cross-RF coverage strategy',
    '## Shared fixtures and data',
    '## Non-functional focus',
    '## Open questions'
  ].join('\n\n')}\n`);
  assert.equal(valid.ok, true);
  const invalid = validateTestDesignSystem('# System Test Design\n## Scope\n');
  assert.equal(invalid.ok, false);
}

function testSpanishTestDesignSections() {
  const system = validateTestDesignSystem(`# Diseno de pruebas de sistema\n${[
    '## Alcance',
    '## Alineacion con arquitectura',
    '## Riesgos de testabilidad',
    '## Estrategia de cobertura entre RFs',
    '## Fixtures y datos compartidos',
    '## Enfoque no funcional',
    '## Preguntas abiertas'
  ].join('\n\n')}\n`);
  assert.equal(system.ok, true);

  const proposal = validateTestDesignProposal(`# Propuesta de diseno de pruebas\n${[
    '## RF oficial',
    'RF-101',
    '## Alcance',
    '## Pruebas propuestas',
    '## Pruebas existentes para reutilizar',
    '## Pruebas existentes que requieren modificacion',
    '## Nuevas pruebas a crear',
    '## Ambiguedades que requieren decision del usuario',
    '## Solicitud de aprobacion'
  ].join('\n\n')}\n`);
  assert.equal(proposal.ok, true);
}

function testTestDesignProposalSections() {
  const valid = validateTestDesignProposal(`# Test Design Proposal\n${[
    '## Official RF ID',
    'RF-101',
    '## Scope',
    '## Proposed tests',
    '## Existing tests to reuse',
    '## Existing tests requiring modification',
    '## New tests to create',
    '## Ambiguities requiring user decision',
    '## Approval request'
  ].join('\n\n')}\n`);
  assert.equal(valid.ok, true);
}

function testReleaseGateWaivedRequiresApprover() {
  const result = validateReleaseGateData({
    decision: 'WAIVED',
    coverage_summary: 'Partial coverage accepted.',
    open_risks: ['Known gap in API tests'],
    evidence_paths: ['qa-ai-output/pr-summary.md']
  });
  assert.ok(result.errors.some((error) => error.includes('approver')));
  assert.ok(result.errors.some((error) => error.includes('waived_reason')));
}

async function testQaHelpQuickTrackPendingGherkin() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-help-'));
  await fs.mkdir(path.join(tempDir, '.qa-ai'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'qa-ai-output'), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'qa-ai.config.yaml'),
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
      '  featurePath: features',
      'traceability:',
      '  matrixPath: qa-ai-output/traceability-matrix.md',
      ''
    ].join('\n'),
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'qa-ai-output', 'requirement-analysis.md'),
    '# Requirement Analysis\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(tempDir, 'qa-ai-output', 'normalized-requirements.md'),
    '# Normalized Requirements\n',
    'utf8'
  );

  const report = await inspectQaWorkflow(tempDir);
  assert.equal(report.track, 'quick');
  assert.ok(!report.pendingPhaseIds.includes('tm-coverage'));
  assert.ok(!report.pendingPhaseIds.includes('feasibility'));
  assert.equal(report.pendingPhaseIds[0], 'gherkin');
  assert.ok(report.recommendations.some((item) => item.title.includes('Gherkin')));
}

async function main() {
  testNormalizeQaTrack();
  testTestDesignSystemSections();
  testTestDesignProposalSections();
  testSpanishTestDesignSections();
  testReleaseGatePass();
  testReleaseGatePendingCanBeAllowed();
  testReleaseGateWaivedRequiresApprover();
  await testQaHelpWithoutConfig();
  await testQaHelpQuickTrackPendingGherkin();
  testValidTable();
  testMissingSeparator();
  testMissingRequiredColumn();
  testWrongCellCount();
  testEmptyRow();
  testEmptyMappingIsValid();
  testValidMappingEntry();
  testMappingEntryMustBeObject();
  testMappingRejectsUnsupportedField();
  testMappingRejectsDuplicateExternalId();
  testMappingRejectsSecretLikeFields();
  await testMappingTemplateIsValid();
  console.log('Validator unit tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
