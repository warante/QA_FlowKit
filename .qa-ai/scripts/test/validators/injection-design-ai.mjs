#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  specialistsForNfrAttributes,
  validateTestDesignProposal,
  validateTestDesignSystem,
  featureCoverageRecord,
  normalizeCoverageMode,
  validateCoverage,
  AI_TESTING_TECHNIQUES,
  techniqueIsKnown,
  validateAiCoverage,
  validateFeatureContent,
  NFR_ATTRIBUTES,
  NFR_EVIDENCE_TYPES,
  parseNormalizedSourceNfrs,
  parseProposalNfrCoverage,
  resolveNonFunctionalCoveragePolicy,
  validateSourceNfrCoverage,
  validateNfrTraceability,
  validateTraceabilityArtifacts,
  featureTraceabilityIds,
  parseNormalizedCriteria,
  validateProposalContract,
  validateSemanticCoverage,
  scanText,
  listFilesRecursive
} from './_fixtures.mjs';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';
// ─── AI Testing ────────────────────────────────────────────────────────────

test('AI_TESTING_TECHNIQUES exports the 7 recognized techniques', () => {
  assert.ok(Array.isArray(AI_TESTING_TECHNIQUES));
  const expected = [
    'adversarial',
    'statistical-consistency',
    'robustness-paraphrase',
    'safety-guardrails',
    'fairness-bias',
    'degradation-fallback',
    'pii-leakage'
  ];
  for (const t of expected) {
    assert.ok(AI_TESTING_TECHNIQUES.includes(t), `Expected ${t} in AI_TESTING_TECHNIQUES`);
  }
  assert.equal(AI_TESTING_TECHNIQUES.length, 7);
});

test('techniqueIsKnown accepts AI techniques', () => {
  assert.ok(techniqueIsKnown('adversarial'));
  assert.ok(techniqueIsKnown('statistical-consistency'));
  assert.ok(techniqueIsKnown('pii-leakage'));
  assert.ok(!techniqueIsKnown('unknown-technique'));
});

test('featureCoverageRecord extracts isAiComponent and aiTechniques', () => {
  const content = `@rf:RF-200 @type:functional @priority:high @manual:false @ai-component @technique:adversarial
Feature: RF-200 chat toxicity guard
  Acceptance Criteria: model refuses toxic inputs
  Scenario: RF-200 adversarial input refused
    Given a toxic prompt
    When sent to the model
    Then the response is refused
`;
  const record = featureCoverageRecord('/features/RF-200-toxicity.feature', content);
  assert.ok(record.isAiComponent, 'isAiComponent should be true');
  assert.ok(record.aiTechniques.includes('adversarial'), 'aiTechniques should include adversarial');
});

test('featureCoverageRecord isAiComponent is false when @ai-component absent', () => {
  const content = `@rf:RF-100 @type:functional @priority:high @manual:false
Feature: RF-100 login
  Acceptance Criteria: user can log in
  Scenario: RF-100 successful login
    Given valid credentials
    When user logs in
    Then the dashboard is shown
`;
  const record = featureCoverageRecord('/features/RF-100-login.feature', content);
  assert.ok(!record.isAiComponent, 'isAiComponent should be false');
  assert.equal(record.aiTechniques.length, 0);
});

test('validateAiCoverage returns ok when mode is off', () => {
  const result = validateAiCoverage({
    features: [],
    proposalContent: '',
    requiredTechniques: ['adversarial'],
    mode: 'off'
  });
  assert.ok(result.ok);
  assert.equal(result.findings.length, 0);
});

test('validateAiCoverage returns ok when requiredTechniques is empty', () => {
  const result = validateAiCoverage({ features: [], proposalContent: '', requiredTechniques: [], mode: 'advisory' });
  assert.ok(result.ok);
});

test('validateAiCoverage reports missing required technique', () => {
  const proposal = `## Proposed tests
| RF | Description | AI component |
| --- | --- | --- |
| RF-200 | Toxicity guard | yes |
`;
  const features = [
    {
      file: '/features/RF-200-toxicity.feature',
      rf: 'RF-200',
      type: 'functional',
      techniques: [],
      hasObservableThen: true,
      isAiComponent: true,
      aiTechniques: ['adversarial']
    }
  ];
  const result = validateAiCoverage({
    features,
    proposalContent: proposal,
    requiredTechniques: ['adversarial', 'safety-guardrails'],
    mode: 'advisory'
  });
  assert.ok(!result.ok || result.findings.length > 0);
  assert.ok(
    result.findings.some((f) => f.message.includes('safety-guardrails')),
    `Expected safety-guardrails finding. Findings: ${JSON.stringify(result.findings)}`
  );
});

test('validateAiCoverage accepts required techniques declared in the proposal table', () => {
  const proposal = `## Proposed tests
| RF | Description | Technique | AI component |
| --- | --- | --- | --- |
| RF-200 | Toxicity guard | adversarial | yes |
| RF-200 | Consistency guard | statistical-consistency | yes |
`;
  const features = [
    {
      file: '/features/RF-200-toxicity.feature',
      rf: 'RF-200',
      type: 'functional',
      techniques: [],
      hasObservableThen: true,
      isAiComponent: true,
      aiTechniques: ['adversarial']
    }
  ];
  const result = validateAiCoverage({
    features,
    proposalContent: proposal,
    requiredTechniques: ['adversarial', 'statistical-consistency'],
    mode: 'strict'
  });
  assert.equal(result.ok, true, `Expected no AI coverage errors, got: ${JSON.stringify(result.findings)}`);
});

test('validateAiCoverage reports unknown AI technique in @technique tag', () => {
  const proposal = `## Proposed tests
| RF | Description | AI component |
| --- | --- | --- |
| RF-201 | Recommendation | yes |
`;
  const features = [
    {
      file: '/features/RF-201-rec.feature',
      rf: 'RF-201',
      type: 'functional',
      techniques: [],
      hasObservableThen: true,
      isAiComponent: true,
      aiTechniques: ['not-a-real-technique']
    }
  ];
  const result = validateAiCoverage({
    features,
    proposalContent: proposal,
    requiredTechniques: ['adversarial'],
    mode: 'advisory'
  });
  assert.ok(
    result.findings.some((f) => f.rule === 'ai-technique-unknown'),
    `Expected ai-technique-unknown finding`
  );
});

test('validateAiCoverage reports missing @ai-component on feature for AI RF', () => {
  const proposal = `## Proposed tests
| RF | Description | AI component |
| --- | --- | --- |
| RF-202 | Score engine | yes |
`;
  const features = [
    {
      file: '/features/RF-202-score.feature',
      rf: 'RF-202',
      type: 'functional',
      techniques: [],
      hasObservableThen: true,
      isAiComponent: false,
      aiTechniques: []
    }
  ];
  const result = validateAiCoverage({
    features,
    proposalContent: proposal,
    requiredTechniques: ['adversarial'],
    mode: 'advisory'
  });
  assert.ok(
    result.findings.some((f) => f.rule === 'ai-component-tag'),
    `Expected ai-component-tag finding`
  );
});

test('validateAiCoverage reports mismatch when feature has @ai-component but proposal does not', () => {
  const proposal = `## Proposed tests
| RF | Description | AI component |
| --- | --- | --- |
| RF-203 | Widget | no |
`;
  const features = [
    {
      file: '/features/RF-203-widget.feature',
      rf: 'RF-203',
      type: 'functional',
      techniques: [],
      hasObservableThen: true,
      isAiComponent: true,
      aiTechniques: ['adversarial']
    }
  ];
  const result = validateAiCoverage({
    features,
    proposalContent: proposal,
    requiredTechniques: ['adversarial'],
    mode: 'advisory'
  });
  assert.ok(
    result.findings.some((f) => f.rule === 'ai-component-mismatch'),
    `Expected ai-component-mismatch finding`
  );
});

test('validateAiCoverage reports mismatch when proposal AI RF has no AI-tagged feature', () => {
  const proposal = `## Proposed tests
| RF | Description | AI component |
| --- | --- | --- |
| RF-204 | Score engine | yes |
`;
  const features = [
    {
      file: '/features/RF-204-score.feature',
      rf: 'RF-204',
      type: 'functional',
      techniques: [],
      hasObservableThen: true,
      isAiComponent: false,
      aiTechniques: []
    }
  ];
  const result = validateAiCoverage({
    features,
    proposalContent: proposal,
    requiredTechniques: ['adversarial'],
    mode: 'strict'
  });
  assert.ok(
    result.findings.some(
      (f) => f.rule === 'ai-component-mismatch' && f.message.includes('no linked feature carries @ai-component')
    ),
    `Expected proposal-to-feature ai-component mismatch. Findings: ${JSON.stringify(result.findings)}`
  );
});

test('validateFeatureContent: @ai-component without @technique raises error when aiTesting enabled', () => {
  const content = `@rf:RF-300 @type:functional @priority:high @manual:false @ai-component
Feature: RF-300 model guard
  Acceptance Criteria: model refuses bad input
  Scenario: RF-300 test
    Given a prompt
    When submitted
    Then the response is safe
`;
  const result = validateFeatureContent(
    content,
    '/features/RF-300-model.feature',
    ['priority', 'type', 'manual'],
    'en',
    { aiTestingConfig: { enabled: true, requiredTechniques: ['adversarial'], optionalTechniques: [] } }
  );
  assertIncludes(result.errors, '@technique');
});

test('validateFeatureContent: @ai-component with unconfigured @technique raises error when aiTesting enabled', () => {
  const content = `@rf:RF-303 @type:functional @priority:high @manual:false @ai-component @technique:pii-leakage
Feature: RF-303 AI guard
  Acceptance Criteria: model refuses bad input
  Scenario: RF-303 adversarial test
    Given a malicious prompt
    When submitted to the model
    Then the model refuses the request
`;
  const result = validateFeatureContent(content, '/features/RF-303-ai.feature', ['priority', 'type', 'manual'], 'en', {
    aiTestingConfig: { enabled: true, requiredTechniques: ['adversarial'], optionalTechniques: [] }
  });
  assertIncludes(result.errors, 'Unknown AI testing technique "pii-leakage"');
});

test('validateFeatureContent: @technique without @ai-component raises error when aiTesting enabled', () => {
  const content = `@rf:RF-301 @type:functional @priority:high @manual:false @technique:adversarial
Feature: RF-301 search
  Acceptance Criteria: search returns results
  Scenario: RF-301 search test
    Given a query
    When search runs
    Then results are shown
`;
  const result = validateFeatureContent(
    content,
    '/features/RF-301-search.feature',
    ['priority', 'type', 'manual'],
    'en',
    { aiTestingConfig: { enabled: true, requiredTechniques: ['adversarial'], optionalTechniques: [] } }
  );
  assertIncludes(result.errors, '@technique');
});

test('validateFeatureContent: @ai-component with @technique passes when aiTesting enabled', () => {
  const content = `@rf:RF-302 @type:functional @priority:high @manual:false @ai-component @technique:adversarial
Feature: RF-302 AI guard
  Acceptance Criteria: model refuses bad input
  Scenario: RF-302 adversarial test
    Given a malicious prompt
    When submitted to the model
    Then the model refuses the request
`;
  const result = validateFeatureContent(content, '/features/RF-302-ai.feature', ['priority', 'type', 'manual'], 'en', {
    aiTestingConfig: { enabled: true, requiredTechniques: ['adversarial'], optionalTechniques: [] }
  });
  assert.equal(result.errors.length, 0, `Expected no errors, got: ${result.errors.join(', ')}`);
});

test('validateFeatureContent: valid English statistical AI scenario passes', () => {
  const content = `@rf:RF-500 @type:functional @priority:high @manual:false @ai-component @technique:statistical-consistency
Feature: RF-500 recommendation consistency
  Acceptance Criteria: Model recommendations remain relevant across repeated runs.
  Scenario: RF-500 TC-001 recommendation remains relevant
    Given the adversarial dataset "package.json"
    When the recommendation prompt is submitted 20 times
    Then the recommendation should satisfy relevance in at least 95% of 20 runs
`;
  const result = validateFeatureContent(
    content,
    '/features/RF-500-ai-statistical.feature',
    ['priority', 'type', 'manual'],
    'en',
    {
      repoRoot,
      aiTestingConfig: {
        enabled: true,
        requiredTechniques: ['statistical-consistency'],
        optionalTechniques: ['adversarial']
      }
    }
  );
  assert.equal(result.errors.length, 0, `Expected no errors, got: ${result.errors.join(', ')}`);
});

test('validateFeatureContent: valid Spanish statistical AI scenario passes', () => {
  const content = `# language: es
@rf:RF-501 @type:functional @priority:high @manual:false @ai-component @technique:statistical-consistency
Caracteristica: Consistencia de recomendacion
  Criterios de aceptación: El modelo mantiene recomendaciones relevantes en ejecuciones repetidas.
  Escenario: RF-501 TC-001 recomendacion consistente
    Dado el dataset adversarial "package.json"
    Cuando se envia el prompt de recomendacion 20 veces
    Entonces la recomendacion debe cumplir relevancia en al menos 95% de 20 ejecuciones
`;
  const result = validateFeatureContent(
    content,
    '/features/RF-501-ai-estadistico.feature',
    ['priority', 'type', 'manual'],
    'es',
    {
      repoRoot,
      aiTestingConfig: {
        enabled: true,
        requiredTechniques: ['statistical-consistency'],
        optionalTechniques: ['adversarial']
      }
    }
  );
  assert.equal(result.errors.length, 0, `Expected no errors, got: ${result.errors.join(', ')}`);
});

test('validateFeatureContent: statistical assertion variants fail with specific messages', () => {
  const base = (
    thenLine,
    extra = ''
  ) => `@rf:RF-502 @type:functional @priority:high @manual:false @ai-component @technique:statistical-consistency
Feature: RF-502 model consistency
  Acceptance Criteria: Model output remains acceptable across repeated runs.
  Scenario: RF-502 TC-001 model consistency
    Given the adversarial dataset "package.json"
    When the prompt is submitted repeatedly
    ${thenLine}
${extra}`;
  const options = {
    repoRoot,
    aiTestingConfig: { enabled: true, requiredTechniques: ['statistical-consistency'], optionalTechniques: [] }
  };

  assertIncludes(
    validateFeatureContent(
      base('Then the response should satisfy policy in at least 101% of 20 runs'),
      '/features/RF-502-ai.feature',
      ['priority', 'type', 'manual'],
      'en',
      options
    ).errors,
    'P must be between 1 and 100'
  );
  assertIncludes(
    validateFeatureContent(
      base('Then the response should satisfy policy in at least 80% of 1 runs'),
      '/features/RF-502-ai.feature',
      ['priority', 'type', 'manual'],
      'en',
      options
    ).errors,
    'N must be at least 2'
  );
  assertIncludes(
    validateFeatureContent(
      base('Then the response should satisfy policy in at least 95% of 5 runs'),
      '/features/RF-502-ai.feature',
      ['priority', 'type', 'manual'],
      'en',
      options
    ).errors,
    'P >= 95 requires at least 10 runs'
  );
  assertIncludes(
    validateFeatureContent(
      base('Then the response should satisfy policy in at least 90% of 20 runs').replace(
        'package.json',
        'missing-dataset.json'
      ),
      '/features/RF-502-ai.feature',
      ['priority', 'type', 'manual'],
      'en',
      options
    ).errors,
    'Adversarial dataset file not found'
  );
  assertIncludes(
    validateFeatureContent(
      base('Then the response should satisfy policy in at least 90% of 20 runs').replace(
        'package.json',
        '../outside.json'
      ),
      '/features/RF-502-ai.feature',
      ['priority', 'type', 'manual'],
      'en',
      options
    ).errors,
    'escapes the repository'
  );
});

test('validateFeatureContent: statistical assertion without @ai-component fails', () => {
  const content = `@rf:RF-503 @type:functional @priority:high @manual:false
Feature: RF-503 classic flow
  Acceptance Criteria: The system behaves predictably.
  Scenario: RF-503 TC-001 classic flow
    Given an input
    When the process runs
    Then the response should satisfy policy in at least 90% of 20 runs
`;
  const result = validateFeatureContent(
    content,
    '/features/RF-503-classic.feature',
    ['priority', 'type', 'manual'],
    'en',
    {
      repoRoot
    }
  );
  assertIncludes(result.errors, 'only valid in scenarios tagged @ai-component');
});

test('validateTestDesignProposal rejects invalid AI component column value', () => {
  const content = `# Test design proposal for RF-400

## Official RF ID
RF-400

## Scope
AI scoring endpoint

## Proposed tests
| RF | Description | AI component |
| --- | --- | --- |
| RF-400 | Score test | maybe |

## Existing tests to reuse
None

## Existing tests requiring modification
None

## New tests to create
RF-400-score.feature

## Ambiguities requiring user decision
None

## Approval request
Ready
`;
  const result = validateTestDesignProposal(content, {});
  assertIncludes(result.errors, 'Unrecognized value');
});

test('validateTestDesignProposal accepts yes/no AI component column values', () => {
  const content = `# Test design proposal for RF-401

## Official RF ID
RF-401

## Scope
AI scoring endpoint

## Proposed tests
| RF | Description | AI component |
| --- | --- | --- |
| RF-401 | Score positive | yes |
| RF-401 | Score negative | no |

## Existing tests to reuse
None

## Existing tests requiring modification
None

## New tests to create
RF-401-score.feature

## Ambiguities requiring user decision
None

## Approval request
Ready
`;
  const result = validateTestDesignProposal(content, {});
  assert.equal(result.errors.length, 0, `Expected no errors, got: ${result.errors.join(', ')}`);
});
