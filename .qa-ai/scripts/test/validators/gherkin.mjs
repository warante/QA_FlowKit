#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { duplicateIdErrors, idsFromText, languageRules, parseFeature, validateFeatureContent, parseFeatureTags, resolveFeatureSubfolder, validateFeatureFilePlacement, parseGherkin, karateDuplicateIdErrors, validateKarateFeatureContent, validateMaestroFlowContent } from './_fixtures.mjs';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';

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

test('validateFeatureContent: rejects unsupported @type:compatibility', () => {
  const content = [
    '@priority:high @type:compatibility @manual:false @rf:RF-101 @id:TC-001',
    'Feature: Browser matrix',
    '  Acceptance Criteria:',
    '    - Works on supported browsers',
    '  Scenario: RF-101 TC-001 Cross-browser',
    '    Given a browser',
    '    When I open the app',
    '    Then it loads'
  ].join('\n');
  const result = validateFeatureContent(content, 'RF-101-TC-001.feature', ['priority', 'type', 'manual'], 'en');
  assert.ok(result.errors.some((e) => e.includes('Unrecognized @type:compatibility')));
});

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

// --- gherkin-parser ---
test('gherkin-parser: parses basic English Gherkin and builds AST with tags and comments', () => {
  const gherkin = [
    '# language: en',
    '# Some comment at the top',
    '@feature-tag @another-tag:value',
    'Feature: User login',
    '  This is a feature description',
    '  spanning multiple lines.',
    '',
    '  Background: Init DB',
    '    Given a clean database',
    '    And seed data is loaded',
    '',
    '  @scenario-tag',
    '  Scenario: Successful login',
    '    # comment here',
    '    Given user exists',
    '    When user logs in',
    '    Then homepage is shown'
  ].join('\n');

  const ast = parseGherkin(gherkin);
  assert.equal(ast.language, 'en');
  assert.equal(ast.comments.length, 3);
  assert.equal(ast.comments[0].text, '# language: en');
  assert.equal(ast.comments[1].text, '# Some comment at the top');
  assert.equal(ast.comments[2].text, '# comment here');

  const f = ast.feature;
  assert.ok(f);
  assert.equal(f.type, 'Feature');
  assert.equal(f.keyword, 'Feature');
  assert.equal(f.name, 'User login');
  assert.equal(f.description, 'This is a feature description\nspanning multiple lines.');
  assert.equal(f.tags.length, 2);
  assert.equal(f.tags[0].name, '@feature-tag');
  assert.equal(f.tags[1].name, '@another-tag:value');

  // children: Background and Scenario
  assert.equal(f.children.length, 2);
  const bg = f.children[0];
  assert.equal(bg.type, 'Background');
  assert.equal(bg.keyword, 'Background');
  assert.equal(bg.name, 'Init DB');
  assert.equal(bg.steps.length, 2);
  assert.equal(bg.steps[0].keyword, 'Given ');
  assert.equal(bg.steps[0].text, 'a clean database');

  const sc = f.children[1];
  assert.equal(sc.type, 'Scenario');
  assert.equal(sc.keyword, 'Scenario');
  assert.equal(sc.name, 'Successful login');
  assert.equal(sc.tags.length, 1);
  assert.equal(sc.tags[0].name, '@scenario-tag');
  assert.equal(sc.steps.length, 3);
  assert.equal(sc.steps[0].keyword, 'Given ');
  assert.equal(sc.steps[0].text, 'user exists');
});

test('gherkin-parser: parses Spanish Gherkin with es keywords', () => {
  const gherkin = [
    '# language: es',
    '@prioridad:alta',
    'Caracteristica: Login usuario',
    '  Esquema del escenario: Login exitoso',
    '    Dado un usuario',
    '    Cuando inicia sesion con "<username>"',
    '    Entonces ve el home',
    '',
    '    Ejemplos:',
    '      | username |',
    '      | admin    |'
  ].join('\n');

  const ast = parseGherkin(gherkin);
  assert.equal(ast.language, 'es');

  const f = ast.feature;
  assert.equal(f.keyword, 'Caracteristica');
  assert.equal(f.name, 'Login usuario');

  const sc = f.children[0];
  assert.equal(sc.keyword, 'Esquema del escenario');
  assert.equal(sc.steps.length, 3);
  assert.equal(sc.steps[1].keyword, 'Cuando ');
  assert.equal(sc.steps[1].text, 'inicia sesion con "<username>"');

  assert.equal(sc.examples.length, 1);
  const ex = sc.examples[0];
  assert.equal(ex.keyword, 'Ejemplos');
  assert.deepEqual(ex.header.cells, ['username']);
  assert.equal(ex.rows.length, 1);
  assert.deepEqual(ex.rows[0].cells, ['admin']);
});

test('gherkin-parser: edge case - docstrings containing Scenario:-like text', () => {
  const gherkin = [
    'Feature: Docstrings test',
    '  Scenario: Docstring',
    '    Given a docstring step',
    '      """',
    '      Scenario: This is not a scenario',
    '        Given this is docstring content',
    '      """',
    '    Then it works'
  ].join('\n');

  const ast = parseGherkin(gherkin);
  const sc = ast.feature.children[0];
  assert.equal(sc.steps.length, 2);
  const step1 = sc.steps[0];
  assert.ok(step1.docString);
  assert.equal(step1.docString.content, 'Scenario: This is not a scenario\n  Given this is docstring content');
  assert.equal(sc.steps[1].keyword, 'Then ');
});

test('gherkin-parser: edge case - data tables with escaped pipes', () => {
  const gherkin = [
    'Feature: Table test',
    '  Scenario: Table',
    '    Given a table step',
    '      | cell 1 | cell 2 \\| with pipe |'
  ].join('\n');

  const ast = parseGherkin(gherkin);
  const sc = ast.feature.children[0];
  const step = sc.steps[0];
  assert.ok(step.dataTable);
  assert.equal(step.dataTable.length, 1);
  assert.deepEqual(step.dataTable[0].cells, ['cell 1', 'cell 2 | with pipe']);
});

test('gherkin-parser: edge case - comments between tags and scenario', () => {
  const gherkin = [
    'Feature: Comments and tags',
    '  @some-tag',
    '  # A comment explaining the scenario below',
    '  Scenario: Target scenario',
    '    Given step'
  ].join('\n');

  const ast = parseGherkin(gherkin);
  const sc = ast.feature.children[0];
  assert.equal(sc.name, 'Target scenario');
  assert.equal(sc.tags.length, 1);
  assert.equal(sc.tags[0].name, '@some-tag');
});

test('gherkin-parser: edge case - CRLF files and BOM', () => {
  const bomGherkin = '\uFEFF# language: en\r\n@tag\r\nFeature: BOM test\r\n';
  const ast = parseGherkin(bomGherkin);
  assert.equal(ast.language, 'en');
  assert.equal(ast.feature.name, 'BOM test');
});

test('gherkin-parser: benchmark - parsing 500 fixture features completes under 5 seconds', () => {
  const template = [
    '# language: en',
    '@priority:high @type:functional @manual:false @rf:RF-101 @id:TC-001',
    'Feature: Login',
    '  Acceptance Criteria:',
    '    - User can login',
    '  Scenario: RF-101 TC-001 Successful login',
    '    Given a user',
    '    When they log in',
    '    Then they see home'
  ].join('\n');

  const start = globalThis.performance.now();
  for (let i = 0; i < 500; i++) {
    parseGherkin(template);
  }
  const end = globalThis.performance.now();
  const durationMs = end - start;

  assert.ok(durationMs < 5000, `Benchmark took ${durationMs}ms, which is over the 5000ms budget`);
});

// --- feature-layout ---

test('resolveFeatureSubfolder: maps @type and @manual to folders', () => {
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:e2e @manual:false')), 'e2e');
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:functional @manual:true')), 'manual');
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:api @manual:false')), 'api');
  assert.equal(resolveFeatureSubfolder(parseFeatureTags('@type:security @manual:false')), 'security');
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
