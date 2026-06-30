#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  validateWorkflowContract,
  normalizeQaTrack,
  activeSpecialists,
  activeSpecialistsContent,
  specialistsForNfrAttributes,
  loadConfigSchema,
  validateConfigData,
  customValidatorsForPhase,
  runCustomValidator,
  validateCustomValidatorConfig,
  NFR_ATTRIBUTES,
  NFR_EVIDENCE_TYPES,
  resolveNonFunctionalCoveragePolicy,
  resolveSourceNfrCoverageMode,
  legacyInferredAcceptanceCriteria,
  hashFile,
  normalizeRequirementsConfig,
  parseSimpleYaml,
  validateQualityReport
} from './_fixtures.mjs';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';
import { writeCustomValidatorFixture } from './yaml.mjs';

test('custom validators: accepts repo-local config and maps phase validators', async () => {
  const cwd = await writeCustomValidatorFixture();
  const config = {
    validators: {
      custom: [
        {
          id: 'naming-check',
          script: 'qa-custom/validate-naming.mjs',
          phases: ['gherkin'],
          blocking: false
        }
      ]
    }
  };
  const result = await validateCustomValidatorConfig(cwd, config, { checkSelfTest: true });
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(
    customValidatorsForPhase(config, 'gherkin').map((validator) => validator.id),
    ['naming-check']
  );
});

test('custom validators: rejects path traversal, duplicate ids, built-in shadows and unknown phases', async () => {
  const cwd = await writeCustomValidatorFixture();
  const config = {
    validators: {
      custom: [
        { id: 'validate-features', script: 'qa-custom/validate-naming.mjs', phases: ['gherkin'] },
        { id: 'dup-check', script: '../outside.mjs', phases: ['gherkin'] },
        { id: 'dup-check', script: 'qa-custom/validate-naming.mjs', phases: ['not-a-phase'] }
      ]
    }
  };
  const result = await validateCustomValidatorConfig(cwd, config);
  assert.equal(result.ok, false);
  assertIncludes(result.errors, "must not shadow built-in validator 'validate-features'");
  assertIncludes(result.errors, 'path must stay inside the repository');
  assertIncludes(result.errors, "duplicates 'dup-check'");
  assertIncludes(result.errors, "unknown phase 'not-a-phase'");
});

test('custom validators: non-blocking failures stay advisory', async () => {
  const cwd = await writeCustomValidatorFixture({ exitCode: 1, ok: false });
  const result = runCustomValidator(cwd, {
    id: 'naming-check',
    script: 'qa-custom/validate-naming.mjs',
    phases: ['gherkin'],
    blocking: false
  });
  assert.equal(result.ok, false);
  assert.equal(result.blocking, false);
  assert.equal(result.findings[0].severity, 'warning');
});

// --- normalizeQaTrack ---

test('normalizeQaTrack: maps aliases and unknown values', () => {
  assert.equal(normalizeQaTrack('fast'), 'quick');
  assert.equal(normalizeQaTrack('enterprise'), 'enterprise');
  assert.equal(normalizeQaTrack('unknown-value'), 'standard');
});

test('activeSpecialists: aiTesting auto-loads eval and red-team specialists', () => {
  const config = {
    agents: { specialistMode: 'auto' },
    aiTesting: { enabled: true },
    automation: { ui: { framework: 'none' }, api: { framework: 'none' }, mobile: { framework: 'none' } },
    tools: { testManagement: 'none', issueTracker: 'none' },
    testDesign: { coverage: { requireSecurityReview: false } }
  };
  const ids = activeSpecialists(config).map(([id]) => id);
  assert.ok(ids.includes('ai-evals'), `Expected ai-evals in ${ids.join(', ')}`);
  assert.ok(ids.includes('ai-red-team'), `Expected ai-red-team in ${ids.join(', ')}`);
  assert.ok(ids.includes('generic-test-design'), `Expected generic-test-design in ${ids.join(', ')}`);
});

test('activeSpecialistsContent: ai specialists point to shipped sources', async () => {
  const config = {
    agents: { specialistMode: 'auto' },
    aiTesting: { enabled: true },
    automation: { ui: { framework: 'none' }, api: { framework: 'none' }, mobile: { framework: 'none' } },
    tools: { testManagement: 'none', issueTracker: 'none' }
  };
  const content = activeSpecialistsContent(config);
  assert.match(content, /`ai-evals`/);
  assert.match(content, /`ai-red-team`/);
  await fs.access(path.join(repoRoot, '.qa-ai/agents/specialists/available/ai-evals.md'));
  await fs.access(path.join(repoRoot, '.qa-ai/agents/specialists/available/ai-red-team.md'));
});

test('specialistsForNfrAttributes: loads security and performance without preventive flags', () => {
  const specialists = specialistsForNfrAttributes(['security', 'performance', 'maintainability']);
  assert.deepEqual(
    specialists.map(([id]) => id),
    ['maintainability', 'observability-testing-agent', 'performance', 'security']
  );
});

test('specialistsForNfrAttributes: maps availability and portability families', () => {
  const specialists = specialistsForNfrAttributes(['availability', 'compatibility']);
  assert.deepEqual(
    specialists.map(([id]) => id),
    ['availability-reliability', 'compatibility-portability']
  );
});

test('validateConfigData: accepts optional testDesign.strategyRouting', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const valid = parseSimpleYaml(
    await fs.readFile(path.join(repoRoot, '.qa-ai', 'presets', 'manual-only.yaml'), 'utf8')
  );
  const withRouting = {
    ...valid,
    testDesign: {
      ...valid.testDesign,
      strategyRouting: {
        mode: 'advisory',
        includeKeywordSignals: true,
        maxSpecialistsPerCriterion: 5
      }
    }
  };
  const result = validateConfigData(withRouting, schema);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('validateConfigData: accepts optional testDesign.strategyRouting.criticalSignals', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const valid = parseSimpleYaml(
    await fs.readFile(path.join(repoRoot, '.qa-ai', 'presets', 'manual-only.yaml'), 'utf8')
  );
  const withCritical = {
    ...valid,
    testDesign: {
      ...valid.testDesign,
      strategyRouting: {
        mode: 'strict',
        criticalSignals: ['gdpr', 'figma', 'analytics event']
      }
    }
  };
  const result = validateConfigData(withCritical, schema);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('validateConfigData: accepts empty criticalSignals array', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const valid = parseSimpleYaml(
    await fs.readFile(path.join(repoRoot, '.qa-ai', 'presets', 'manual-only.yaml'), 'utf8')
  );
  const withEmpty = {
    ...valid,
    testDesign: {
      ...valid.testDesign,
      strategyRouting: { mode: 'strict', criticalSignals: [] }
    }
  };
  const result = validateConfigData(withEmpty, schema);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('validateConfigData: rejects unknown strategyRouting mode', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const valid = parseSimpleYaml(
    await fs.readFile(path.join(repoRoot, '.qa-ai', 'presets', 'manual-only.yaml'), 'utf8')
  );
  const invalid = {
    ...valid,
    testDesign: {
      ...valid.testDesign,
      strategyRouting: { mode: 'lenient' }
    }
  };
  const result = validateConfigData(invalid, schema);
  assert.equal(result.ok, false);
  assertIncludes(result.errors, '$.testDesign.strategyRouting.mode');
});

test('validateWorkflowContract: accepts shipped workflow.v1.json', async () => {
  const result = await validateWorkflowContract(repoRoot);
  assert.equal(result.ok, true, result.errors?.join('\n'));
});

test('validateConfigData: accepts every shipped preset', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const presetDir = path.join(repoRoot, '.qa-ai', 'presets');
  const presetFiles = (await fs.readdir(presetDir)).filter((name) => name.endsWith('.yaml'));
  assert.ok(presetFiles.length > 0, 'expected shipped presets');
  for (const presetFile of presetFiles) {
    const content = await fs.readFile(path.join(presetDir, presetFile), 'utf8');
    assert.ok(!content.includes('allowInferredAcceptanceCriteria'), `${presetFile} should not use legacy keys`);
    assert.ok(!content.includes('requireApprovalForInferredCriteria'), `${presetFile} should not use legacy keys`);
    const config = parseSimpleYaml(content);
    assert.equal(config.testDesign?.quality?.mode, 'off', `${presetFile} should default quality mode to off`);
    const result = validateConfigData(config, schema);
    assert.equal(result.ok, true, `${presetFile}\n${result.errors.join('\n')}`);
  }
});

test('gherkin quality rubric: versioned binary criteria cover all dimensions', async () => {
  const content = await fs.readFile(path.join(repoRoot, '.qa-ai', 'rules', 'gherkin-quality.rubric.md'), 'utf8');
  const dimensions = [
    'requirement-fidelity',
    'observability',
    'atomicity',
    'determinism',
    'data-independence',
    'ui-overspecification',
    'language-clarity',
    'source-criterion-alignment'
  ];

  assert.match(content, /^rubricVersion: 1$/m);
  assert.match(content, /\bpass\b[\s\S]*\bfail\b/i);
  assert.doesNotMatch(content, /\b(?:Score|Points|Rating)\s*:/i);
  assert.doesNotMatch(content, /\b[0-9]\s*\/\s*[0-9]\b/);

  for (const dimension of dimensions) {
    const section = content.split(`## ${dimension}`)[1]?.split('\n## ')[0] || '';
    const criteria = section.split('\n').filter((line) => line.startsWith('- '));
    assert.ok(section.includes('Definition:'), `${dimension} should define the dimension`);
    assert.ok(criteria.length >= 2 && criteria.length <= 4, `${dimension} should have 2-4 criteria`);
  }
});

const qualityDimensions = [
  'requirement-fidelity',
  'observability',
  'atomicity',
  'determinism',
  'data-independence',
  'ui-overspecification',
  'language-clarity',
  'source-criterion-alignment'
];

async function createQualityFixture({ mode = 'gate', minDimensionsPassed = 7 } = {}) {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-quality-'));
  const featureRel = 'features/functional/RF-101-TC-001-login.feature';
  const reportRel = 'qa-ai-output/gherkin-quality-report.md';
  const featureContent = [
    '@rf:RF-101 @id:TC-001 @priority:high @type:functional @manual:false',
    'Feature: Login',
    '',
    'Acceptance Criteria:',
    '- User sees the account home page after valid login.',
    '',
    'Scenario: RF-101 TC-001 user signs in',
    '  Given the user has valid credentials',
    '  When the user signs in',
    '  Then the account home page is displayed',
    ''
  ].join('\n');

  await fs.mkdir(path.join(cwd, 'features', 'functional'), { recursive: true });
  await fs.mkdir(path.join(cwd, 'qa-ai-output'), { recursive: true });
  await fs.mkdir(path.join(cwd, '.qa-ai', 'rules'), { recursive: true });
  await fs.copyFile(
    path.join(repoRoot, '.qa-ai', 'rules', 'gherkin-quality.rubric.md'),
    path.join(cwd, '.qa-ai', 'rules', 'gherkin-quality.rubric.md')
  );
  await fs.writeFile(
    path.join(cwd, 'qa-ai.config.yaml'),
    [
      'project:',
      '  qaTrack: standard',
      'gherkin:',
      '  featurePath: features',
      'testDesign:',
      '  quality:',
      `    mode: ${mode}`,
      `    reportPath: ${reportRel}`,
      `    minDimensionsPassed: ${minDimensionsPassed}`,
      ''
    ].join('\n'),
    'utf8'
  );
  await fs.writeFile(path.join(cwd, featureRel), featureContent, 'utf8');
  const hash = await hashFile(path.join(cwd, featureRel));
  const rows = qualityDimensions.map(
    (dimension) => `| ${dimension} | ${dimension} criterion | pass | "Then the account home page is displayed" |`
  );
  const report = [
    '# Gherkin Quality Report',
    '- Rubric Version: 1',
    '- Run ID: RUN-001',
    '- RF ID: RF-101',
    '- Evaluation Date: 2026-06-18T00:00:00Z',
    '',
    '## Evaluated Files',
    '',
    '| File | Content hash |',
    '| ---- | ------------ |',
    `| ${featureRel} | ${hash} |`,
    '',
    `## File: ${featureRel}`,
    '',
    '| Dimension | Criterion | Verdict (pass/fail) | Evidence (quoted line) |',
    '| --------- | --------- | ------------------- | ---------------------- |',
    ...rows,
    '',
    '## Summary',
    '',
    '| File | Dimensions passed | Verdict |',
    '| ---- | ----------------- | ------- |',
    `| ${featureRel} | 8 | pass |`,
    ''
  ].join('\n');
  await fs.writeFile(path.join(cwd, reportRel), report, 'utf8');
  return { cwd, featureRel, reportRel, report, hash };
}

test('validateQualityReport: accepts a complete current report', async () => {
  const fixture = await createQualityFixture();
  try {
    const result = await validateQualityReport(fixture.cwd, { rf: 'RF-101' });
    assert.equal(result.ok, true, result.findings.map((f) => f.message).join('\n'));
    assert.equal(result.evaluatedFiles.length, 1);
  } finally {
    await fs.rm(fixture.cwd, { recursive: true, force: true });
  }
});

test('validateQualityReport: detects stale hash, missing file, missing dimension and empty evidence', async () => {
  const fixture = await createQualityFixture();
  try {
    let content = fixture.report
      .replace(fixture.hash, 'stale-hash')
      .replace(`| ${qualityDimensions[0]} |`, '| missing-dimension |')
      .replace('"Then the account home page is displayed"', '');
    content = content.replace(`## File: ${fixture.featureRel}`, `## File: ${fixture.featureRel}\n`);
    await fs.writeFile(path.join(fixture.cwd, fixture.reportRel), content, 'utf8');
    const result = await validateQualityReport(fixture.cwd, { rf: 'RF-101' });
    const messages = result.findings.map((f) => f.message).join('\n');
    assert.equal(result.ok, false);
    assert.match(messages, /stale content hash/);
    assert.match(messages, /unknown or missing quality dimension/);
    assert.match(messages, /missing dimension requirement-fidelity/);
    assert.match(messages, /evidence is required/);
  } finally {
    await fs.rm(fixture.cwd, { recursive: true, force: true });
  }
});

test('validateQualityReport: detects report rows for files outside the evaluated RF', async () => {
  const fixture = await createQualityFixture();
  try {
    const other = 'features/functional/RF-999-TC-001-other.feature';
    const content = fixture.report.replace(fixture.featureRel, other);
    await fs.writeFile(path.join(fixture.cwd, fixture.reportRel), content, 'utf8');
    const result = await validateQualityReport(fixture.cwd, { rf: 'RF-101' });
    const messages = result.findings.map((f) => f.message).join('\n');
    assert.equal(result.ok, false);
    assert.match(messages, /missing from the Evaluated Files table/);
    assert.match(messages, /not an evaluated feature file/);
  } finally {
    await fs.rm(fixture.cwd, { recursive: true, force: true });
  }
});

test('validateQualityReport: summary mismatch fails', async () => {
  const fixture = await createQualityFixture();
  try {
    const content = fixture.report.replace(
      `| ${fixture.featureRel} | 8 | pass |`,
      `| ${fixture.featureRel} | 6 | pass |`
    );
    await fs.writeFile(path.join(fixture.cwd, fixture.reportRel), content, 'utf8');
    const result = await validateQualityReport(fixture.cwd, { rf: 'RF-101' });
    assert.equal(result.ok, false);
    assert.match(result.findings.map((f) => f.message).join('\n'), /summary says 6 dimensions passed, expected 8/);
  } finally {
    await fs.rm(fixture.cwd, { recursive: true, force: true });
  }
});

test('validateQualityReport: below threshold fails in gate and warns in advisory', async () => {
  const gate = await createQualityFixture({ mode: 'gate' });
  try {
    const content = gate.report
      .replace('| determinism | determinism criterion | pass |', '| determinism | determinism criterion | fail |')
      .replace(
        '| source-criterion-alignment | source-criterion-alignment criterion | pass |',
        '| source-criterion-alignment | source-criterion-alignment criterion | fail |'
      )
      .replace(`| ${gate.featureRel} | 8 | pass |`, `| ${gate.featureRel} | 6 | fail |`);
    await fs.writeFile(path.join(gate.cwd, gate.reportRel), content, 'utf8');
    const result = await validateQualityReport(gate.cwd, { rf: 'RF-101' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((finding) => finding.failedDimensions?.includes('determinism')));
  } finally {
    await fs.rm(gate.cwd, { recursive: true, force: true });
  }

  const advisory = await createQualityFixture({ mode: 'advisory' });
  try {
    const content = advisory.report
      .replace('| determinism | determinism criterion | pass |', '| determinism | determinism criterion | fail |')
      .replace(
        '| source-criterion-alignment | source-criterion-alignment criterion | pass |',
        '| source-criterion-alignment | source-criterion-alignment criterion | fail |'
      )
      .replace(`| ${advisory.featureRel} | 8 | pass |`, `| ${advisory.featureRel} | 6 | fail |`);
    await fs.writeFile(path.join(advisory.cwd, advisory.reportRel), content, 'utf8');
    const result = await validateQualityReport(advisory.cwd, { rf: 'RF-101' });
    assert.equal(result.ok, true, result.findings.map((f) => f.message).join('\n'));
    assert.equal(result.warnings.length, 1);
  } finally {
    await fs.rm(advisory.cwd, { recursive: true, force: true });
  }
});

test('validateConfigData: reports schema violations with JSON paths', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const valid = parseSimpleYaml(
    await fs.readFile(path.join(repoRoot, '.qa-ai', 'presets', 'manual-only.yaml'), 'utf8')
  );
  const invalid = {
    ...valid,
    unknownTopLevel: true,
    project: { ...valid.project, qaTrack: 'slow' },
    gherkin: { ...valid.gherkin, oneScenarioPerFile: 'yes' }
  };
  const result = validateConfigData(invalid, schema);
  assert.equal(result.ok, false);
  assertIncludes(result.errors, '$.unknownTopLevel');
  assertIncludes(result.errors, '$.project.qaTrack');
  assertIncludes(result.errors, '$.gherkin.oneScenarioPerFile');
});

test('validateConfigData: accepts optional testDesign.nonFunctionalCoverage', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const valid = parseSimpleYaml(
    await fs.readFile(path.join(repoRoot, '.qa-ai', 'presets', 'manual-only.yaml'), 'utf8')
  );
  const withNfr = {
    ...valid,
    testDesign: {
      ...valid.testDesign,
      nonFunctionalCoverage: {
        mode: 'inherit',
        requireDecisionForSourceNfr: true,
        allowResidualRiskInAdvisory: true
      }
    }
  };
  const result = validateConfigData(withNfr, schema);
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('validateConfigData: rejects unknown nonFunctionalCoverage mode', async () => {
  const schema = await loadConfigSchema(repoRoot);
  const valid = parseSimpleYaml(
    await fs.readFile(path.join(repoRoot, '.qa-ai', 'presets', 'manual-only.yaml'), 'utf8')
  );
  const invalid = {
    ...valid,
    testDesign: {
      ...valid.testDesign,
      nonFunctionalCoverage: { mode: 'lenient' }
    }
  };
  const result = validateConfigData(invalid, schema);
  assert.equal(result.ok, false);
  assertIncludes(result.errors, '$.testDesign.nonFunctionalCoverage.mode');
});

test('resolveSourceNfrCoverageMode: inherit off still advises on source NFRs', () => {
  assert.equal(
    resolveSourceNfrCoverageMode({
      testDesign: { coverage: { mode: 'off' }, nonFunctionalCoverage: { mode: 'inherit' } }
    }),
    'advisory'
  );
  assert.equal(
    resolveSourceNfrCoverageMode({
      testDesign: { coverage: { mode: 'strict' }, nonFunctionalCoverage: { mode: 'inherit' } }
    }),
    'strict'
  );
  assert.equal(
    resolveSourceNfrCoverageMode({
      testDesign: { coverage: { mode: 'off' }, nonFunctionalCoverage: { mode: 'off' } }
    }),
    'off'
  );
});

test('resolveNonFunctionalCoveragePolicy: defaults preserve backward compatibility', () => {
  const policy = resolveNonFunctionalCoveragePolicy({
    testDesign: { coverage: { mode: 'advisory' } }
  });
  assert.equal(policy.mode, 'advisory');
  assert.equal(policy.requireDecisionForSourceNfr, true);
  assert.equal(policy.allowResidualRiskInAdvisory, true);
  assert.equal(NFR_ATTRIBUTES.length, 10);
  assert.equal(NFR_EVIDENCE_TYPES.length, 6);
});

test('legacyInferredAcceptanceCriteria: maps legacy boolean pairs', () => {
  assert.equal(
    legacyInferredAcceptanceCriteria({
      allowInferredAcceptanceCriteria: false,
      requireApprovalForInferredCriteria: true
    }),
    'forbid'
  );
  assert.equal(
    legacyInferredAcceptanceCriteria({
      allowInferredAcceptanceCriteria: true,
      requireApprovalForInferredCriteria: true
    }),
    'require-approval'
  );
  assert.equal(
    legacyInferredAcceptanceCriteria({
      allowInferredAcceptanceCriteria: true,
      requireApprovalForInferredCriteria: false
    }),
    'allow'
  );
});

test('normalizeRequirementsConfig: materializes legacy inferred acceptance policy', () => {
  const config = normalizeRequirementsConfig({
    requirements: {
      requireOfficialRfId: true,
      allowInferredAcceptanceCriteria: true,
      requireApprovalForInferredCriteria: false
    }
  });
  assert.equal(config.requirements.inferredAcceptanceCriteria, 'allow');
});
