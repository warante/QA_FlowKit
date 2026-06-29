#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWorkflowContract } from '../../lib/harness-contract.mjs';
import { inspectQaWorkflow, normalizeQaTrack } from '../../lib/qa-next-steps.mjs';
import { activeSpecialists, activeSpecialistsContent, specialistsForNfrAttributes } from '../../lib/project-config.mjs';
import { validateReleaseGateData } from '../../lib/release-gate.mjs';
import { loadConfigSchema, validateConfigData } from '../../lib/config-schema.mjs';
import {
  customValidatorsForPhase,
  runCustomValidator,
  validateCustomValidatorConfig
} from '../../lib/custom-validators.mjs';
import { validateTestDesignProposal, validateTestDesignSystem } from '../../lib/test-design.mjs';
import { parseMarkdownTable } from '../../lib/markdown-table.mjs';
import { validateTestManagementMapping } from '../../lib/test-management-mapping.mjs';
import {
  duplicateIdErrors,
  idsFromText,
  languageRules,
  parseFeature,
  validateFeatureContent
} from '../../lib/gherkin-validate.mjs';
import { parseFeatureTags, resolveFeatureSubfolder, validateFeatureFilePlacement } from '../../lib/feature-layout.mjs';
import { parse as parseGherkin } from '../../lib/gherkin-parser.mjs';
import { parseYaml } from '../../lib/yaml.mjs';
import { karateDuplicateIdErrors, validateKarateFeatureContent } from '../../lib/karate-validate.mjs';
import { validateMaestroFlowContent } from '../../lib/maestro-validate.mjs';
import {
  AI_TESTING_TECHNIQUES,
  featureCoverageRecord,
  normalizeCoverageMode,
  techniqueIsKnown,
  validateAiCoverage,
  validateCoverage
} from '../../lib/test-coverage.mjs';
import {
  NFR_ATTRIBUTES,
  NFR_EVIDENCE_TYPES,
  parseNormalizedSourceNfrs,
  parseProposalNfrCoverage,
  resolveNonFunctionalCoveragePolicy,
  resolveSourceNfrCoverageMode,
  validateSourceNfrCoverage,
  validateNfrTraceability
} from '../../lib/nfr-coverage.mjs';
import { validateTraceabilityArtifacts, featureTraceabilityIds } from '../../lib/traceability-validate.mjs';
import {
  parseNormalizedCriteria,
  validateProposalContract,
  validateSemanticCoverage
} from '../../lib/semantic-coverage.mjs';
import { scanText } from '../../lib/injection-patterns.mjs';
import { scanPathsForSecrets } from '../../lib/secret-patterns.mjs';
import {
  legacyInferredAcceptanceCriteria,
  hashFile,
  listFilesRecursive,
  normalizeRequirementsConfig,
  parseSimpleYaml
} from '../../lib/utils.mjs';
import { validateQualityReport } from '../../lib/quality-report.mjs';
import { parseJUnitXml, parseCucumberJson, extractTestIds } from '../../lib/execution-results.mjs';
import { parseEvalJson, parseGenericEvalJson, parsePromptfooJson } from '../../lib/eval-results.mjs';
import { validateExecutionEvidence, resolveGlobs } from '../../validate-execution-evidence.mjs';
import { validateReleaseGateFile } from '../../validate-release-gate.mjs';
import { validateHealingLog } from '../../validate-healing-log.mjs';
import { validateTestImpact } from '../../validate-test-impact.mjs';
import { exportReport } from '../../export-report.mjs';
import { assertIncludes, repoRoot } from './_shared.mjs';

// --- validateHealingLog ---

async function setupHealingFixture({ matrixContent = '', logContent = '', createSpecFile = true } = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-healing-'));
  await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });
  await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
  await fs.mkdir(path.join(tmp, 'tests'), { recursive: true });

  const yamlContent = [
    'project:',
    '  qaTrack: standard',
    'gherkin:',
    '  featurePath: features',
    'traceability:',
    '  matrixPath: qa-ai-output/traceability-matrix.md',
    'automation:',
    '  ui:',
    '    framework: playwright',
    '    specsPath: tests',
    ''
  ].join('\n');

  await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), yamlContent, 'utf8');

  const defaultMatrix =
    matrixContent ||
    `
# Traceability Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/login.md | RF-101 | CA-1 | features/login.feature | TC-101 | e2e | high | automated | tests/login.spec.js |
`;
  await fs.writeFile(path.join(tmp, 'qa-ai-output/traceability-matrix.md'), defaultMatrix, 'utf8');

  if (logContent) {
    await fs.writeFile(path.join(tmp, 'qa-ai-output/healing-log.md'), logContent, 'utf8');
  }

  if (createSpecFile) {
    await fs.writeFile(path.join(tmp, 'tests/login.spec.js'), '// mock spec\n', 'utf8');
  }

  return tmp;
}

test('validateHealingLog: accepts valid healing log', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | tests/login.spec.js | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: detects invalid Test ID', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-999 | tests/login.spec.js | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('not registered in the traceability matrix')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: detects invalid repair type', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | tests/login.spec.js | timeout | invalid-type | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Invalid repair type')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: checks justification length for other', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | tests/login.spec.js | timeout | other | short |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes('Justification for "other" repair type must be at least 20 characters'))
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: path safety checks (escaping spec path)', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | external.spec.js | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('is not within any configured automation spec directories')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateHealingLog: path safety checks (Gherkin feature file)', async () => {
  const logContent = `
| Test ID | File | Failure | Repair type | Justification |
| --- | --- | --- | --- | --- |
| TC-101 | features/login.feature | timeout | selector | Replaced broken xpath selector with robust CSS attribute selector |
`;
  const tmp = await setupHealingFixture({ logContent });
  try {
    const result = await validateHealingLog(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('never modify Gherkin design feature files')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// --- validateTestImpact ---

async function setupTestImpactFixture({ matrixContent = '', reportContent = '' } = {}) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-test-impact-'));
  await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });

  const yamlContent = [
    'project:',
    '  qaTrack: standard',
    'traceability:',
    '  matrixPath: qa-ai-output/traceability-matrix.md',
    ''
  ].join('\n');

  await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), yamlContent, 'utf8');

  const defaultMatrix =
    matrixContent ||
    `
# Traceability Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/login.md | RF-101 | CA-1 | features/login.feature | TC-101 | e2e | high | automated | tests/login.spec.js |
| reqs/login.md | RF-101 | CA-2 | features/login.feature | TC-102 | e2e | high | automated | tests/login.spec.js |
| reqs/logout.md | RF-102 | CA-1 | features/logout.feature | TC-103 | e2e | high | automated | tests/logout.spec.js |
`;
  await fs.writeFile(path.join(tmp, 'qa-ai-output/traceability-matrix.md'), defaultMatrix, 'utf8');

  if (reportContent) {
    await fs.writeFile(path.join(tmp, 'qa-ai-output/test-impact-analysis.md'), reportContent, 'utf8');
  }

  return tmp;
}

test('validateTestImpact: succeeds on complete valid impact report', async () => {
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101, TC-102 | Changed login page components |
| Account | RF-102 | TC-103 | Logout flow changed |

## Selected Test IDs

- TC-101
- TC-102
- TC-103
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails if report is missing and allowMissing is false', async () => {
  const tmp = await setupTestImpactFixture();
  try {
    const result = await validateTestImpact(tmp, { allowMissing: false });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Test impact analysis report file not found')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: succeeds if report is missing and allowMissing is true', async () => {
  const tmp = await setupTestImpactFixture();
  try {
    const result = await validateTestImpact(tmp, { allowMissing: true });
    assert.equal(result.ok, true, result.errors.join('\n'));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on unknown test ID', async () => {
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101, TC-999 | Changed login page components |

## Selected Test IDs

- TC-101
- TC-999
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Test ID "TC-999" is not registered')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on unknown RF', async () => {
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-999 | TC-101 | Changed login page components |

## Selected Test IDs

- TC-101
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('RF "RF-999" is not registered')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on selected list mismatch (silent additions / removals)', async () => {
  // Silent removal: TC-102 is in the table but missing from Selected Test IDs list
  const reportContent1 = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101, TC-102 | Changed login page components |

## Selected Test IDs

- TC-101
`;
  const tmp1 = await setupTestImpactFixture({ reportContent: reportContent1 });
  try {
    const result = await validateTestImpact(tmp1);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('missing from the Selected Test IDs list')));
  } finally {
    await fs.rm(tmp1, { recursive: true, force: true });
  }

  // Silent addition: TC-103 is in Selected Test IDs list but not in Impacted Areas table
  const reportContent2 = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101 | Changed login page components |

## Selected Test IDs

- TC-101
- TC-103
`;
  const tmp2 = await setupTestImpactFixture({ reportContent: reportContent2 });
  try {
    const result = await validateTestImpact(tmp2);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('not in the Impacted Areas table')));
  } finally {
    await fs.rm(tmp2, { recursive: true, force: true });
  }
});

test('validateTestImpact: fails on missing matrix test for an affected RF (Superset Rule violation)', async () => {
  // RF-101 is affected, which has TC-101 and TC-102 in the matrix.
  // But we only included TC-101 in the table and Selected Test IDs.
  // This satisfies the Union Check, but violates the Superset Rule!
  const reportContent = `
# Test Impact Analysis

## Impacted Areas

| Changed area | Affected RF | Affected test IDs | Inclusion reason |
| --- | --- | --- | --- |
| Authentication | RF-101 | TC-101 | Changed login page components |

## Selected Test IDs

- TC-101
`;
  const tmp = await setupTestImpactFixture({ reportContent });
  try {
    const result = await validateTestImpact(tmp);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('Superset Rule')));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

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

