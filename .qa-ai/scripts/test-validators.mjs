#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWorkflowContract } from './lib/harness-contract.mjs';
import { inspectQaWorkflow, normalizeQaTrack } from './lib/qa-next-steps.mjs';
import { validateReleaseGateData } from './lib/release-gate.mjs';
import { validateTestDesignProposal, validateTestDesignSystem } from './lib/test-design.mjs';
import { parseMarkdownTable } from './lib/markdown-table.mjs';
import { validateTestManagementMapping } from './lib/test-management-mapping.mjs';
import {
  duplicateIdErrors,
  idsFromText,
  languageRules,
  parseFeature,
  validateFeatureContent
} from './lib/gherkin-validate.mjs';
import { parseFeatureTags, resolveFeatureSubfolder, validateFeatureFilePlacement } from './lib/feature-layout.mjs';
import { karateDuplicateIdErrors, validateKarateFeatureContent } from './lib/karate-validate.mjs';
import { validateMaestroFlowContent } from './lib/maestro-validate.mjs';
import { parseSimpleYaml } from './lib/utils.mjs';

function assertIncludes(haystack, needle) {
  assert.ok(
    haystack.some((item) => item.includes(needle)),
    `Expected an error containing: ${needle}\nActual errors:\n${haystack.join('\n')}`
  );
}

// --- parseSimpleYaml ---

test('parseSimpleYaml: strips inline comment from unquoted value', () => {
  const result = parseSimpleYaml('key: value # this is a comment\n');
  assert.equal(result.key, 'value');
});

test('parseSimpleYaml: strips inline comment from boolean value', () => {
  const result = parseSimpleYaml('enabled: false # disabled\n');
  assert.equal(result.enabled, false);
});

test('parseSimpleYaml: preserves # inside quoted string', () => {
  const result = parseSimpleYaml('path: "has # hash inside"\n');
  assert.equal(result.path, 'has # hash inside');
});

test('parseSimpleYaml: resolves nested mappings', () => {
  const yaml = [
    'automation:',
    '  ui:',
    '    framework: webdriverio',
    '  api:',
    '    framework: playwright-api',
    ''
  ].join('\n');
  const result = parseSimpleYaml(yaml);
  assert.equal(result.automation.ui.framework, 'webdriverio');
  assert.equal(result.automation.api.framework, 'playwright-api');
});

test('parseSimpleYaml: parses booleans and null scalars', () => {
  const result = parseSimpleYaml('a: true\nb: false\nc: null\nd: ~\n');
  assert.equal(result.a, true);
  assert.equal(result.b, false);
  assert.equal(result.c, null);
  assert.equal(result.d, null);
});

test('parseSimpleYaml: parses numbers', () => {
  const result = parseSimpleYaml('count: 42\nratio: 3.14\n');
  assert.equal(result.count, 42);
  assert.equal(result.ratio, 3.14);
});

test('parseSimpleYaml: parses flat list under a key', () => {
  const result = parseSimpleYaml('items:\n  - alpha\n  - beta\n  - gamma\n');
  assert.deepEqual(result.items, ['alpha', 'beta', 'gamma']);
});

test('parseSimpleYaml: ignores full-line comments', () => {
  const result = parseSimpleYaml('# full line comment\nkey: value\n');
  assert.equal(result.key, 'value');
  assert.equal(Object.keys(result).length, 1);
});

// --- normalizeQaTrack ---

test('normalizeQaTrack: maps aliases and unknown values', () => {
  assert.equal(normalizeQaTrack('fast'), 'quick');
  assert.equal(normalizeQaTrack('enterprise'), 'enterprise');
  assert.equal(normalizeQaTrack('unknown-value'), 'standard');
});

test('validateWorkflowContract: accepts shipped workflow.v1.json', async () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const result = await validateWorkflowContract(repoRoot);
  assert.equal(result.ok, true, result.errors?.join('\n'));
});

// --- test design ---

test('validateTestDesignSystem: accepts valid English sections', () => {
  const valid = validateTestDesignSystem(
    `# System Test Design\n${[
      '## Scope',
      '## Architecture alignment',
      '## Testability risks',
      '## Cross-RF coverage strategy',
      '## Shared fixtures and data',
      '## Non-functional focus',
      '## Open questions'
    ].join('\n\n')}\n`
  );
  assert.equal(valid.ok, true);
});

test('validateTestDesignSystem: rejects incomplete sections', () => {
  const invalid = validateTestDesignSystem('# System Test Design\n## Scope\n');
  assert.equal(invalid.ok, false);
});

test('validateTestDesignProposal: accepts valid English proposal', () => {
  const valid = validateTestDesignProposal(
    `# Test Design Proposal\n${[
      '## Official RF ID',
      'RF-101',
      '## Scope',
      '## Proposed tests',
      '## Existing tests to reuse',
      '## Existing tests requiring modification',
      '## New tests to create',
      '## Ambiguities requiring user decision',
      '## Approval request'
    ].join('\n\n')}\n`
  );
  assert.equal(valid.ok, true);
});

test('validateTestDesignSystem: accepts valid Spanish sections', () => {
  const system = validateTestDesignSystem(
    `# Diseno de pruebas de sistema\n${[
      '## Alcance',
      '## Alineacion con arquitectura',
      '## Riesgos de testabilidad',
      '## Estrategia de cobertura entre RFs',
      '## Fixtures y datos compartidos',
      '## Enfoque no funcional',
      '## Preguntas abiertas'
    ].join('\n\n')}\n`
  );
  assert.equal(system.ok, true);
});

test('validateTestDesignProposal: accepts valid Spanish proposal', () => {
  const proposal = validateTestDesignProposal(
    `# Propuesta de diseno de pruebas\n${[
      '## RF oficial',
      'RF-101',
      '## Alcance',
      '## Pruebas propuestas',
      '## Pruebas existentes para reutilizar',
      '## Pruebas existentes que requieren modificacion',
      '## Nuevas pruebas a crear',
      '## Ambiguedades que requieren decision del usuario',
      '## Solicitud de aprobacion'
    ].join('\n\n')}\n`
  );
  assert.equal(proposal.ok, true);
});

// --- release gate ---

test('validateReleaseGateData: accepts PASS decision', () => {
  const result = validateReleaseGateData({
    decision: 'PASS',
    approver: 'QA Lead',
    coverage_summary: 'All validators passed.',
    open_risks: ['None documented'],
    evidence_paths: ['qa-ai-output/traceability-matrix.md', 'qa-ai-output/pr-summary.md']
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.decision, 'PASS');
});

test('validateReleaseGateData: PENDING is invalid by default but accepted with allowPending', () => {
  const draft = {
    decision: 'PENDING',
    coverage_summary: 'Draft review in progress.',
    open_risks: ['Pending QA lead review'],
    evidence_paths: ['qa-ai-output/pr-summary.md']
  };
  assert.notEqual(validateReleaseGateData(draft).errors.length, 0);
  assert.deepEqual(validateReleaseGateData(draft, { allowPending: true }).errors, []);
});

test('validateReleaseGateData: WAIVED requires approver and waived_reason', () => {
  const result = validateReleaseGateData({
    decision: 'WAIVED',
    coverage_summary: 'Partial coverage accepted.',
    open_risks: ['Known gap in API tests'],
    evidence_paths: ['qa-ai-output/pr-summary.md']
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
    assert.ok(
      report.recommendations.some((item) => item.title.includes('Gherkin') || item.title.includes('Next phase'))
    );
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

// --- validateTestManagementMapping ---

test('validateTestManagementMapping: empty mapping is valid', () => {
  assert.deepEqual(validateTestManagementMapping({}, { source: 'mapping.json' }), []);
});

test('validateTestManagementMapping: valid entry with all fields', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': {
        externalId: 'C123',
        section: 'Login',
        suite: 'Regression',
        status: 'planned',
        lastReviewedAt: '2026-05-25',
        notes: 'Created from QA FlowKit proposal.'
      }
    },
    { source: 'mapping.json' }
  );
  assert.deepEqual(errors, []);
});

test('validateTestManagementMapping: entry must be an object', () => {
  const errors = validateTestManagementMapping({ 'TC-001': 'C123' }, { source: 'mapping.json' });
  assertIncludes(errors, 'entry "TC-001" must be an object');
});

test('validateTestManagementMapping: rejects unsupported field', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { externalId: 'C123', owner: 'qa' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'unsupported field "owner"');
});

test('validateTestManagementMapping: rejects duplicate externalId', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { externalId: 'C123' },
      'TC-002': { externalId: 'C123' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'externalId "C123" is used by both');
});

test('validateTestManagementMapping: rejects secret-like fields', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': {
        externalId: 'C123',
        apiToken: 'github_pat_1234567890abcdefghijklmnop'
      }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'unsupported field "apiToken"');
  assertIncludes(errors, 'appears to contain a secret');
});

test('validateTestManagementMapping: template file is valid', async () => {
  const templatePath = path.resolve('.qa-ai/templates/test-management-mapping.template.json');
  const parsed = JSON.parse(await fs.readFile(templatePath, 'utf8'));
  assert.deepEqual(validateTestManagementMapping(parsed, { source: 'test-management-mapping.template.json' }), []);
});

// --- gherkin-validate ---

const validEnFeature = [
  '@priority:high @type:functional @manual:true @rf:RF-101 @id:TC-001',
  'Feature: Login',
  '  Acceptance Criteria:',
  '    - User can log in',
  '  Scenario: RF-101 TC-001 Successful login',
  '    Given a user',
  '    When they log in',
  '    Then they see home'
].join('\n');

test('validateFeatureContent: valid English feature passes', () => {
  const result = validateFeatureContent(
    validEnFeature,
    'features/RF-101-TC-001-login.feature',
    ['priority', 'type', 'manual'],
    'en'
  );
  assert.deepEqual(result.errors, []);
});

test('validateFeatureContent: Spanish requires language header', () => {
  const result = validateFeatureContent(
    validEnFeature,
    'features/RF-101.feature',
    ['priority', 'type', 'manual'],
    'es'
  );
  assertIncludes(result.errors, '# language: es');
});

test('validateFeatureContent: Scenario Outline counts as single scenario', () => {
  const outline = [
    '# language: es',
    '@priority:medium @type:functional @manual:false @rf:RF-200 @id:TC-002',
    'Caracteristica: Busqueda',
    '  Criterios de aceptación:',
    '    - Resultados visibles',
    '  Esquema del escenario: RF-200 TC-002 Buscar',
    '    Cuando busco "<term>"',
    '    Entonces veo resultados'
  ].join('\n');
  const parsed = parseFeature(outline, 'es');
  assert.equal(parsed.scenarioLines.length, 1);
  assert.ok(languageRules('es').scenarioPattern.test(parsed.scenarioLines[0].text));
});

test('validateFeatureContent: strict-tags requires @rf and @id', () => {
  const minimal = [
    '@priority:high @type:functional @manual:true',
    'Feature: Login',
    '  Acceptance Criteria:',
    '    - ok',
    '  Scenario: RF-101 TC-001 Login',
    '    Given x',
    '    When y',
    '    Then z'
  ].join('\n');
  const loose = validateFeatureContent(minimal, 'RF-101-TC-001.feature', ['priority', 'type', 'manual'], 'en');
  assert.equal(loose.errors.length, 0);
  const strict = validateFeatureContent(minimal, 'RF-101-TC-001.feature', ['priority', 'type', 'manual'], 'en', {
    strictTags: true
  });
  assertIncludes(strict.errors, '@rf:');
  assertIncludes(strict.errors, '@id:');
});

test('duplicateIdErrors: detects duplicate TC across files', () => {
  const errors = duplicateIdErrors([
    { file: 'a.feature', caseIds: ['TC-001'] },
    { file: 'b.feature', caseIds: ['TC-001'] }
  ]);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('TC-001'));
});

test('idsFromText: does not treat tests directory as a TEST identifier', () => {
  assert.deepEqual(idsFromText('tests/karate/features/RF-201-TC-001.feature'), ['RF-201', 'TC-001']);
});

test('idsFromText: does not treat ordinary QA-prefixed prose as an identifier', () => {
  assert.deepEqual(idsFromText('The QA handbook covers RF-301 and QA 123.'), ['RF-301', 'QA-123']);
});

const validKarateApi = [
  '@smoke @rf:RF-101',
  'Feature: Create post API',
  '',
  '  Background:',
  '    * url baseUrl',
  '',
  '  Scenario: Create post',
  "    * path 'posts'",
  "    * request { title: 'Test' }",
  '    * method post',
  '    * status 201',
  "    * match response.title == 'Test'"
].join('\n');

test('validateKarateFeatureContent: valid API Karate feature passes', () => {
  const result = validateKarateFeatureContent(validKarateApi, 'tests/karate/features/api/create.feature', {
    isUiPath: false
  });
  assert.deepEqual(result.errors, []);
});

test('validateKarateFeatureContent: missing Feature fails', () => {
  const result = validateKarateFeatureContent('Scenario: x\n  * print true\n', 'x.feature', { isUiPath: false });
  assert.ok(result.errors.some((e) => e.includes('Feature')));
});

test('validateKarateFeatureContent: QA Acceptance Criteria block fails Karate validator', () => {
  const result = validateKarateFeatureContent(validEnFeature, 'tests/karate/features/api/bad.feature', {
    isUiPath: false
  });
  assert.ok(result.errors.some((e) => e.includes('Acceptance Criteria')));
  const gherkin = validateFeatureContent(
    validEnFeature,
    'features/RF-101-TC-001-login.feature',
    ['priority', 'type', 'manual'],
    'en'
  );
  assert.deepEqual(gherkin.errors, []);
});

test('karateDuplicateIdErrors: detects duplicate @id', () => {
  const errors = karateDuplicateIdErrors([
    { file: 'a.feature', caseIds: ['TC-001'] },
    { file: 'b.feature', caseIds: ['TC-001'] }
  ]);
  assert.equal(errors.length, 1);
});

test('validateMaestroFlowContent: accepts a deterministic flow', () => {
  const result = validateMaestroFlowContent(
    ['appId: ${APP_ID}', '---', '- launchApp:', '    clearState: true', '- assertVisible: "Home"'].join('\n'),
    'tests/maestro/flows/home.yaml'
  );
  assert.equal(result.ok, true);
});

test('validateMaestroFlowContent: rejects escaping subflow paths', () => {
  const result = validateMaestroFlowContent(
    ['appId: ${APP_ID}', '---', '- runFlow: ../private.yaml'].join('\n'),
    'tests/maestro/flows/home.yaml'
  );
  assert.equal(result.ok, false);
  assertIncludes(result.errors, 'must stay inside');
});

// --- feature-layout ---

test('resolveFeatureSubfolder: maps @type and @manual to folders', () => {
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:e2e @manual:false')), 'e2e');
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:functional @manual:true')), 'manual');
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:api @manual:false')), 'api');
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:regression @manual:false')), 'functional');
});

test('validateFeatureFilePlacement: warns on feature root file', () => {
  const root = path.join('/repo', 'features');
  const file = path.join(root, 'RF-101-TC-001-login.feature');
  const content = '@priority:high @type:functional @manual:false\nFeature: Login\n';
  const { warnings, expectedSubfolder } = validateFeatureFilePlacement(file, root, content);
  assert.equal(expectedSubfolder, 'functional');
  assert.ok(warnings.some((w) => w.includes('functional')));
});
