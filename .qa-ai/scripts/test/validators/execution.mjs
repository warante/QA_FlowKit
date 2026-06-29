#!/usr/bin/env node
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateTestManagementMapping, parseJUnitXml, parseCucumberJson, extractTestIds, parseEvalJson, parseGenericEvalJson, parsePromptfooJson, validateExecutionEvidence, resolveGlobs, validateReleaseGateFile, exportReport } from './_fixtures.mjs';
import { assertIncludes, repoRoot, runValidatorScript, withTempWorkspace } from './_shared.mjs';

// --- P3-T-004 Execution Results Parser Unit Tests ---

test('parseJUnitXml: parses standard JUnit XML with pass, fail, error, skipped, CDATA', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Mocha Tests" time="1.5">
  <testsuite name="Suite 1" tests="4" failures="1" errors="1" skipped="1" time="1.5">
    <testcase name="should pass" classname="Suite 1" time="0.5" />
    <testcase name="should fail" classname="Suite 1" time="0.4">
      <failure message="Assertion failed" type="AssertionError"><![CDATA[Error details here]]></failure>
    </testcase>
    <testcase name="should error" classname="Suite 1" time="0.3">
      <error message="Crash in test" type="TypeError">Unexpected crash</error>
    </testcase>
    <testcase name="should skip" classname="Suite 1" time="0.3">
      <skipped message="Pending implementation" />
    </testcase>
  </testsuite>
</testsuites>`;

  const result = parseJUnitXml(xml, 'test-junit.xml');
  assert.equal(result.cases.length, 4);

  const tc1 = result.cases[0];
  assert.equal(tc1.name, 'should pass');
  assert.equal(tc1.classname, 'Suite 1');
  assert.equal(tc1.status, 'passed');
  assert.equal(tc1.durationMs, 500);

  const tc2 = result.cases[1];
  assert.equal(tc2.name, 'should fail');
  assert.equal(tc2.status, 'failed');
  assert.equal(tc2.durationMs, 400);
  assert.ok(tc2.message.includes('Assertion failed'));
  assert.ok(tc2.message.includes('Error details here'));

  const tc3 = result.cases[2];
  assert.equal(tc3.name, 'should error');
  assert.equal(tc3.status, 'failed');
  assert.equal(tc3.durationMs, 300);
  assert.ok(tc3.message.includes('Crash in test'));
  assert.ok(tc3.message.includes('Unexpected crash'));

  const tc4 = result.cases[3];
  assert.equal(tc4.name, 'should skip');
  assert.equal(tc4.status, 'skipped');
  assert.equal(tc4.durationMs, 300);
  assert.ok(tc4.message.includes('Pending implementation'));
});

test('parseJUnitXml: handles nested suites and malformed XML errors', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Root Suite">
  <testsuite name="Nested Suite">
    <testcase name="nested pass" classname="Nested Suite" time="0.05" />
  </testsuite>
</testsuite>`;

  const result = parseJUnitXml(xml, 'test-nested.xml');
  assert.equal(result.cases.length, 1);
  assert.equal(result.cases[0].name, 'nested pass');
  assert.equal(result.cases[0].status, 'passed');

  // malformed XML
  assert.throws(() => {
    parseJUnitXml('not xml', 'bad.xml');
  }, /Malformed XML in file bad.xml/);
});

test('parseJUnitXml: sanitizes executable XML-like failure text', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Security Suite">
  <testcase name="rejects script" classname="Security" time="0.01">
    <failure message="Assertion failed"><![CDATA[<script>alert(1)</script><script]]></failure>
  </testcase>
</testsuite>`;

  const result = parseJUnitXml(xml, 'test-security.xml');
  assert.equal(result.cases.length, 1);
  assert.equal(result.cases[0].status, 'failed');
  assert.doesNotMatch(result.cases[0].message, /<script/i);
  assert.match(result.cases[0].message, /&lt;script/);
});

test('parseCucumberJson: parses standard Cucumber JSON', () => {
  const json = JSON.stringify([
    {
      uri: 'features/login.feature',
      id: 'login-feature',
      name: 'Login',
      elements: [
        {
          id: 'login;pass',
          name: 'login successfully',
          type: 'scenario',
          tags: [{ name: '@priority:high' }, { name: '@id:TC-101' }],
          steps: [{ name: 'step 1', result: { status: 'passed', duration: 100000000 } }]
        },
        {
          id: 'login;fail',
          name: 'login fails',
          type: 'scenario',
          steps: [
            { name: 'step 1', result: { status: 'passed', duration: 50000000 } },
            { name: 'step 2', result: { status: 'failed', duration: 150000000, error_message: 'Oops failed' } }
          ]
        },
        {
          id: 'login;skip',
          name: 'login skipped',
          type: 'scenario',
          steps: [{ name: 'step 1', result: { status: 'skipped', duration: 10000000 } }]
        }
      ]
    }
  ]);

  const result = parseCucumberJson(json, 'cucumber.json');
  assert.equal(result.cases.length, 3);

  assert.equal(result.cases[0].name, 'login successfully');
  assert.equal(result.cases[0].status, 'passed');
  assert.equal(result.cases[0].durationMs, 100);
  assert.deepEqual(result.cases[0].tags, ['@priority:high', '@id:TC-101']);

  assert.equal(result.cases[1].name, 'login fails');
  assert.equal(result.cases[1].status, 'failed');
  assert.equal(result.cases[1].durationMs, 200);
  assert.equal(result.cases[1].message, 'Oops failed');

  assert.equal(result.cases[2].name, 'login skipped');
  assert.equal(result.cases[2].status, 'skipped');
  assert.equal(result.cases[2].durationMs, 10);
});

test('parseCucumberJson: handles malformed JSON errors', () => {
  assert.throws(() => {
    parseCucumberJson('invalid-json', 'bad.json');
  }, /Malformed Cucumber JSON in file bad.json/);

  assert.throws(() => {
    parseCucumberJson('{}', 'not-array.json');
  }, /top-level element is not an array/);
});

test('extractTestIds: finds IDs in multiple fields using default pattern', () => {
  const caseObj = {
    name: 'TC-101 login scenario',
    classname: 'Suite TC-102',
    uri: 'features/TC-103.feature',
    tags: ['@id:TC-104', '@rf:RF-201']
  };

  const ids = extractTestIds(caseObj);
  // Por defecto, extractTestIds usa caseIdPattern que busca TC/TEST/QA pero NO RF
  assert.ok(ids.includes('TC-101'));
  assert.ok(ids.includes('TC-102'));
  assert.ok(ids.includes('TC-103'));
  assert.ok(ids.includes('TC-104'));
  assert.ok(!ids.includes('RF-201')); // RF no forma parte de caseIdPattern por defecto

  // Si pasamos un patrón diferente
  const customIds = extractTestIds(caseObj, /RF-\d+/gi);
  assert.deepEqual(customIds, ['RF-201']);

  // Caso sin IDs
  const noIds = extractTestIds({ name: 'just plain text' });
  assert.deepEqual(noIds, []);
});

test('validateTestManagementMapping: supports quarantined and quarantineReason', () => {
  // Datos válidos
  const validData = {
    'TC-101': {
      externalId: '123',
      quarantined: true,
      quarantineReason: 'Flaky login test'
    },
    'TC-102': {
      externalId: '124',
      quarantined: false
    }
  };
  const validErrors = validateTestManagementMapping(validData);
  assert.equal(validErrors.length, 0);

  // Errores de tipo y propiedad requerida
  const invalidData = {
    'TC-103': {
      quarantined: 'yes', // should be boolean
      quarantineReason: 123 // should be string
    },
    'TC-104': {
      quarantined: true // missing reason
    }
  };
  const invalidErrors = validateTestManagementMapping(invalidData);
  assert.equal(invalidErrors.length, 3);
  assertIncludes(invalidErrors, 'field "quarantined" must be a boolean');
  assertIncludes(invalidErrors, 'field "quarantineReason" must be a string');
  assertIncludes(invalidErrors, 'field "quarantined" must be a boolean');
  assertIncludes(invalidErrors, 'field "quarantineReason" must be a string');
  assertIncludes(invalidErrors, 'is quarantined but missing a "quarantineReason"');
});

// --- P3-T-005 Execution Evidence Integration Tests ---

test('resolveGlobs: resolves standard and wildcard path formats', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-globs-'));
  try {
    await fs.mkdir(path.join(tmp, 'reports', 'sub'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'reports', 'junit-1.xml'), '<xml />', 'utf8');
    await fs.writeFile(path.join(tmp, 'reports', 'sub', 'junit-2.xml'), '<xml />', 'utf8');
    await fs.writeFile(path.join(tmp, 'reports', 'other.txt'), 'text', 'utf8');

    // 1. Sin wildcard, archivo existente
    const res1 = await resolveGlobs(tmp, ['reports/junit-1.xml']);
    assert.equal(res1.length, 1);
    assert.ok(res1[0].endsWith('junit-1.xml'));

    // 2. Con wildcard simple *
    const res2 = await resolveGlobs(tmp, ['reports/*.xml']);
    assert.equal(res2.length, 1);
    assert.ok(res2[0].endsWith('junit-1.xml'));

    // 3. Con wildcard recursivo **
    const res3 = await resolveGlobs(tmp, ['reports/**/*.xml']);
    assert.equal(res3.length, 2);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('parseEvalJson: normalizes generic eval schema', () => {
  const parsed = parseGenericEvalJson(
    JSON.stringify({
      tool: 'deepeval',
      createdAt: '2026-06-18T10:00:00Z',
      cases: [
        {
          id: 'EVAL-1',
          rfId: 'RF-200',
          name: 'RF-200 safety guardrails',
          pass: true,
          score: 0.98,
          threshold: 0.95
        }
      ]
    }),
    'eval.json'
  );
  assert.equal(parsed.tool, 'deepeval');
  assert.equal(parsed.cases.length, 1);
  assert.equal(parsed.cases[0].status, 'passed');
  assert.equal(parsed.cases[0].rfId, 'RF-200');
  assert.equal(parsed.cases[0].score, 0.98);
});

test('parseEvalJson: normalizes promptfoo results schema', () => {
  const parsed = parsePromptfooJson(
    JSON.stringify({
      results: [
        {
          vars: { id: 'EVAL-2', rfId: 'RF-201' },
          testCase: { description: 'RF-201 adversarial refusal' },
          gradingResult: { pass: false, score: 0.7, threshold: 0.95, reason: 'unsafe answer' }
        }
      ]
    }),
    'promptfoo.json'
  );
  assert.equal(parsed.tool, 'promptfoo');
  assert.equal(parsed.cases.length, 1);
  assert.equal(parsed.cases[0].status, 'failed');
  assert.equal(parsed.cases[0].message, 'unsafe answer');
});

test('parseEvalJson: reports structured malformed eval errors', () => {
  assert.throws(
    () => parseEvalJson('{ "tool": "generic", "cases": [{ "id": "EVAL-3", "pass": "maybe" }] }', 'bad-eval.json'),
    /Malformed generic eval JSON in file bad-eval\.json: cases\[0\]\.pass must be boolean-like/
  );
  assert.throws(
    () => parseEvalJson('{ "results": [{ "name": "RF-200 eval" }] }', 'bad-promptfoo.json'),
    /Malformed promptfoo JSON in file bad-promptfoo\.json: results\[0\] must include pass status/
  );
});

test('validateExecutionEvidence: validates traceability against execution results and quarantines', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-evidence-val-'));
  try {
    // Config
    const configYaml = `
version: 1
project:
  name: Project Alpha
  qaTrack: enterprise
execution:
  resultsPaths:
    - reports/*.xml
    - reports/*.json
testrail:
  mappingFile: qa-ai-output/mapping.json
traceability:
  matrixPath: qa-ai-output/matrix.md
`;
    await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), configYaml, 'utf8');

    // Matrix
    const matrixMd = `
# Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/login.md | RF-101 | CA-1 | features/login.feature | TC-101 | e2e | high | automated | tests/login.spec.js |
| reqs/login.md | RF-101 | CA-2 | features/logout.feature | TC-102 | e2e | high | automated | tests/logout.spec.js |
| reqs/login.md | RF-101 | CA-3 | features/manual.feature | TC-103 | manual | low | manual | |
`;
    await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'matrix.md'), matrixMd, 'utf8');

    // Mapping with quarantine
    const mappingJson = JSON.stringify({
      'TC-102': {
        quarantined: true,
        quarantineReason: 'Flaky logout test',
        lastReviewedAt: '2026-06-01'
      }
    });
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'mapping.json'), mappingJson, 'utf8');

    // Results: TC-101 passes, TC-102 fails (quarantined)
    await fs.mkdir(path.join(tmp, 'reports'), { recursive: true });
    const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="E2E Tests">
  <testcase name="should pass TC-101" classname="Login" time="0.1" />
  <testcase name="should fail TC-102" classname="Logout" time="0.1">
    <failure message="Logout failed" />
  </testcase>
</testsuite>`;
    await fs.writeFile(path.join(tmp, 'reports', 'junit.xml'), junitXml, 'utf8');

    // Run programmatic validation
    const result = await validateExecutionEvidence(tmp);
    assert.equal(
      result.ok,
      true,
      `Expected success because TC-102 is quarantined, errors: ${result.errors.join('\n')}`
    );
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0].includes('TC-102'));
    assert.ok(result.warnings[0].includes('Flaky logout test'));

    // RF Report asserts
    const rfReport = result.report['RF-101'];
    assert.equal(rfReport.totalTests, 3);
    assert.equal(rfReport.automatedTests, 2);
    assert.equal(rfReport.passed, 1);
    assert.equal(rfReport.failed, 0);
    assert.equal(rfReport.quarantinedFailed, 1);
    assert.equal(rfReport.status, 'quarantined-failed');

    // Test non-quarantined failure
    const mappingJsonNoQuarantine = JSON.stringify({});
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'mapping.json'), mappingJsonNoQuarantine, 'utf8');
    const resultFail = await validateExecutionEvidence(tmp);
    assert.equal(resultFail.ok, false, 'Expected validation to fail without quarantine');
    assert.equal(resultFail.errors.length, 1);
    assert.ok(resultFail.errors[0].includes('TC-102'));

    // Test missing results when allow-missing is false
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'mapping.json'), mappingJson, 'utf8');
    await fs.writeFile(path.join(tmp, 'reports', 'junit.xml'), '<testsuites></testsuites>', 'utf8');
    const resultMissing = await validateExecutionEvidence(tmp, { allowMissing: false });
    assert.equal(resultMissing.ok, false);
    assert.ok(resultMissing.errors.some((e) => e.includes('Missing execution results')));

    // Test missing results when allow-missing is true
    const resultMissingOk = await validateExecutionEvidence(tmp, { allowMissing: true });
    assert.equal(resultMissingOk.ok, true);
    assert.equal(resultMissingOk.report['RF-101'].missing, 2);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateExecutionEvidence: enforces eval evidence for AI RFs and statistical thresholds', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-ai-eval-evidence-'));
  try {
    const configYaml = `
version: 1
project:
  name: Project AI
  qaTrack: enterprise
aiTesting:
  enabled: true
execution:
  evalResultsPaths:
    - reports/evals/*.json
traceability:
  matrixPath: qa-ai-output/matrix.md
`;
    await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), configYaml, 'utf8');
    await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'features', 'functional'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'reports', 'evals'), { recursive: true });

    const aiFeature = `@rf:RF-200 @type:functional @priority:high @manual:false @ai-component @technique:statistical-consistency
Feature: RF-200 response consistency
  Acceptance Criteria: model output remains policy-compliant across repeated runs
  Scenario: RF-200 response remains compliant
    Given the adversarial dataset "data/prompts.txt"
    When the same prompt is submitted 20 times
    Then the response should satisfy policy compliance in at least 95% of 20 runs
`;
    await fs.writeFile(path.join(tmp, 'features', 'functional', 'RF-200-TC-001-ai.feature'), aiFeature, 'utf8');

    const nonAiFeature = `@rf:RF-100 @type:functional @priority:medium @manual:true
Feature: RF-100 login
  Acceptance Criteria: user can log in
  Scenario: RF-100 login works
    Given a valid user
    When the user logs in
    Then the home page is shown
`;
    await fs.writeFile(path.join(tmp, 'features', 'functional', 'RF-100-TC-001-login.feature'), nonAiFeature, 'utf8');

    const matrixMd = `
# Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | AI component |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/ai.md | RF-200 | CA-1 | features/functional/RF-200-TC-001-ai.feature | TC-200 | functional | high | manual | yes |
| reqs/login.md | RF-100 | CA-1 | features/functional/RF-100-TC-001-login.feature | TC-100 | manual | medium | manual | no |
`;
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'matrix.md'), matrixMd, 'utf8');

    const missing = await validateExecutionEvidence(tmp);
    assert.equal(missing.ok, false);
    assertIncludes(missing.errors, 'No eval results files found for AI RF evidence');

    await fs.writeFile(
      path.join(tmp, 'reports', 'evals', 'ai-evals.json'),
      JSON.stringify({
        tool: 'generic',
        cases: [{ id: 'EVAL-200', rfId: 'RF-200', name: 'RF-200 eval case', pass: false, score: 0.98, threshold: 0.95 }]
      }),
      'utf8'
    );
    const failing = await validateExecutionEvidence(tmp);
    assert.equal(failing.ok, false);
    assertIncludes(failing.errors, 'Eval failure for AI RF RF-200 in case "RF-200 eval case"');

    await fs.writeFile(
      path.join(tmp, 'reports', 'evals', 'ai-evals.json'),
      JSON.stringify({
        tool: 'generic',
        cases: [{ id: 'EVAL-200', rfId: 'RF-200', name: 'RF-200 eval case', pass: true, score: 0.9, threshold: 0.95 }]
      }),
      'utf8'
    );
    const belowThreshold = await validateExecutionEvidence(tmp);
    assert.equal(belowThreshold.ok, false);
    assertIncludes(belowThreshold.errors, 'Statistical eval threshold failed for AI RF RF-200');

    await fs.writeFile(
      path.join(tmp, 'reports', 'evals', 'ai-evals.json'),
      JSON.stringify({
        tool: 'generic',
        cases: [{ id: 'EVAL-200', rfId: 'RF-200', name: 'RF-200 eval case', pass: true, score: 0.97, threshold: 0.95 }]
      }),
      'utf8'
    );
    const passing = await validateExecutionEvidence(tmp);
    assert.equal(passing.ok, true, `Expected passing eval evidence, errors: ${passing.errors.join('\n')}`);
    assert.equal(passing.report['RF-100'].status, 'passed');
    assert.equal(passing.report['RF-200'].evalCases.length, 1);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateReleaseGateFile: enforces validateExecutionEvidence on PASS for enterprise track', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-gate-val-integ-'));
  try {
    // Config
    const configYaml = `
version: 1
project:
  name: Project Alpha
  qaTrack: enterprise
execution:
  resultsPaths:
    - reports/*.xml
traceability:
  matrixPath: qa-ai-output/matrix.md
release:
  gatePath: qa-ai-output/release-gate.yaml
`;
    await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), configYaml, 'utf8');

    // Matrix (1 automated TC)
    const matrixMd = `
# Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/login.md | RF-101 | CA-1 | features/login.feature | TC-101 | e2e | high | automated | tests/login.spec.js |
`;
    await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'matrix.md'), matrixMd, 'utf8');

    // Results: empty/missing
    await fs.mkdir(path.join(tmp, 'reports'), { recursive: true });

    // Release Gate file (PASS decision)
    const gateYaml = `
decision: PASS
approver: Reviewer1
coverage_summary: Coverage summary content
evidence_paths:
  - qa-ai-output/matrix.md
evidence:
  execution:
    - reports/junit.xml
`;
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'release-gate.yaml'), gateYaml, 'utf8');

    // 1. Debería fallar el release gate porque falta la evidencia de ejecución para TC-101
    // (el archivo xml está vacío y no hay resultados)
    const resGate = await validateReleaseGateFile(tmp, 'qa-ai-output/release-gate.yaml');
    assert.equal(resGate.ok, false);
    assert.ok(resGate.errors.some((e) => e.includes('execution evidence check failed')));

    // 2. Si escribimos un resultado exitoso para TC-101 en reports/junit.xml, debería pasar
    const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="E2E Tests">
  <testcase name="TC-101 passes" classname="Login" time="0.1" />
</testsuite>`;
    await fs.writeFile(path.join(tmp, 'reports', 'junit.xml'), junitXml, 'utf8');
    const resGatePass = await validateReleaseGateFile(tmp, 'qa-ai-output/release-gate.yaml');
    assert.equal(resGatePass.ok, true, `Expected gate to pass, errors: ${resGatePass.errors.join('\n')}`);

    // 3. Si cambiamos la decisión a WAIVED (con approver y reason), debería pasar aun si la evidencia falla o falta
    const gateYamlWaived = `
decision: WAIVED
approver: Manager1
waived_reason: Skip execution results checks for fast path
coverage_summary: Coverage summary content
evidence_paths:
  - qa-ai-output/matrix.md
evidence:
  execution:
    - reports/junit.xml
`;
    await fs.writeFile(path.join(tmp, 'reports', 'junit.xml'), '<invalid xml>', 'utf8'); // romper xml
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'release-gate.yaml'), gateYamlWaived, 'utf8');

    const resGateWaived = await validateReleaseGateFile(tmp, 'qa-ai-output/release-gate.yaml');
    assert.equal(resGateWaived.ok, true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validateReleaseGateFile: enforces AI eval evidence on enterprise PASS', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-gate-ai-eval-'));
  try {
    const configYaml = `
version: 1
project:
  name: Project AI
  qaTrack: enterprise
aiTesting:
  enabled: true
execution:
  evalResultsPaths:
    - reports/evals/*.json
traceability:
  matrixPath: qa-ai-output/matrix.md
release:
  gatePath: qa-ai-output/release-gate.yaml
`;
    await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), configYaml, 'utf8');
    await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'features', 'functional'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'reports', 'evals'), { recursive: true });

    await fs.writeFile(
      path.join(tmp, 'features', 'functional', 'RF-300-TC-001-ai.feature'),
      `@rf:RF-300 @type:functional @priority:high @manual:false @ai-component @technique:safety-guardrails
Feature: RF-300 safety guardrail
  Acceptance Criteria: unsafe prompt is refused
  Scenario: RF-300 prompt is refused
    Given an unsafe prompt
    When the prompt is submitted
    Then the model refuses the request
`,
      'utf8'
    );

    await fs.writeFile(
      path.join(tmp, 'qa-ai-output', 'matrix.md'),
      `
# Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/ai.md | RF-300 | CA-1 | features/functional/RF-300-TC-001-ai.feature | TC-300 | functional | high | manual |
`,
      'utf8'
    );

    const gateYaml = `
decision: PASS
approver: Reviewer1
coverage_summary: Coverage summary content
evidence_paths:
  - qa-ai-output/matrix.md
evidence:
  execution: []
  evals: []
`;
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'release-gate.yaml'), gateYaml, 'utf8');

    const missing = await validateReleaseGateFile(tmp, 'qa-ai-output/release-gate.yaml');
    assert.equal(missing.ok, false);
    assertIncludes(missing.errors, 'execution evidence check failed: No eval results files found for AI RF evidence');

    await fs.writeFile(
      path.join(tmp, 'reports', 'evals', 'ai-evals.json'),
      JSON.stringify({
        tool: 'generic',
        cases: [{ id: 'EVAL-300', rfId: 'RF-300', name: 'RF-300 eval', pass: false }]
      }),
      'utf8'
    );
    const failing = await validateReleaseGateFile(tmp, 'qa-ai-output/release-gate.yaml');
    assert.equal(failing.ok, false);
    assertIncludes(
      failing.errors,
      'execution evidence check failed: Eval failure for AI RF RF-300 in case "RF-300 eval"'
    );

    await fs.writeFile(
      path.join(tmp, 'reports', 'evals', 'ai-evals.json'),
      JSON.stringify({ tool: 'generic', cases: [{ id: 'EVAL-300', rfId: 'RF-300', name: 'RF-300 eval', pass: true }] }),
      'utf8'
    );
    const passing = await validateReleaseGateFile(tmp, 'qa-ai-output/release-gate.yaml');
    assert.equal(passing.ok, true, `Expected AI gate to pass, errors: ${passing.errors.join('\n')}`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('exportReport: validates format and enforces path safety', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-export-validation-'));
  try {
    // 1. Invalid format
    await assert.rejects(exportReport(tmp, { format: 'invalid' }), /Unsupported format/);

    // 2. Path safety escape
    await assert.rejects(
      exportReport(tmp, { format: 'cucumber-json', out: '../escaped-path' }),
      /path must stay inside the repository/
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('exportReport: exports cucumber-json, allure, and junit-xml with execution results and determinism', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-export-full-'));
  try {
    // Setup config
    const configYaml = `
version: 1
project:
  name: Project Alpha
  qaTrack: enterprise
execution:
  resultsPaths:
    - reports/*.xml
traceability:
  matrixPath: qa-ai-output/traceability-matrix.md
`;
    await fs.writeFile(path.join(tmp, 'qa-ai.config.yaml'), configYaml, 'utf8');

    // Create folders
    await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'reports'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'qa-ai-output'), { recursive: true });

    // Write Gherkin feature file
    const featureContent = `Feature: User Login
  @priority:high @type:automated @manual:false
  Scenario: TC-101 Login successfully
    Given the user is on the login page
    When the user enters credentials
    Then the user is logged in
`;
    await fs.writeFile(path.join(tmp, 'features', 'login.feature'), featureContent, 'utf8');

    // Write mock JUnit XML results file (TC-101 failed)
    const junitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="E2E Tests">
  <testcase name="TC-101 Login successfully" classname="Login" time="0.150">
    <failure message="Credentials incorrect"><![CDATA[Error: invalid credentials]]></failure>
  </testcase>
</testsuite>`;
    await fs.writeFile(path.join(tmp, 'reports', 'results.xml'), junitXml, 'utf8');

    // Write traceability matrix
    const matrixMd = `
# Traceability Matrix
| Requirement Source | RF | CA | Feature File | Test Management Case ID | Type | Priority | Automation Status | Automation File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| reqs/login.md | RF-101 | CA-1 | features/login.feature | TC-101 | e2e | high | automated | tests/login.spec.js |
`;
    await fs.writeFile(path.join(tmp, 'qa-ai-output', 'traceability-matrix.md'), matrixMd, 'utf8');

    // Setup initial manifest file to track it
    await fs.mkdir(path.join(tmp, '.qa-ai', 'state'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, '.qa-ai', 'state', 'init-manifest.json'),
      JSON.stringify({ version: 1, entries: [] }),
      'utf8'
    );

    // 1. Export Cucumber JSON
    const resCucumber = await exportReport(tmp, {
      format: 'cucumber-json',
      fixedTimestamp: '1718728800000',
      fixedUuid: 'test-seed'
    });

    assert.equal(resCucumber.format, 'cucumber-json');
    assert.equal(resCucumber.totalCases, 1);

    // Read and verify cucumber.json
    const cjsonRaw = await fs.readFile(path.join(tmp, resCucumber.exportedFiles[0]), 'utf8');
    const cjson = JSON.parse(cjsonRaw);
    assert.equal(cjson.length, 1);
    assert.equal(cjson[0].name, 'User Login');
    assert.equal(cjson[0].elements.length, 1);
    assert.equal(cjson[0].elements[0].name, 'TC-101 Login successfully');

    // Check steps and distributed failed status
    const steps = cjson[0].elements[0].steps;
    assert.equal(steps.length, 3);
    assert.equal(steps[0].name, 'the user is on the login page');
    assert.equal(steps[0].result.status, 'failed');
    assert.equal(steps[0].result.error_message, 'Credentials incorrect\nError: invalid credentials');
    assert.equal(steps[0].result.duration, 50000000); // 150ms / 3 = 50ms (50000000ns)
    assert.equal(steps[1].result.status, 'skipped');
    assert.equal(steps[1].result.duration, 0);

    // Verify manifest entries
    const manifestRaw = await fs.readFile(path.join(tmp, '.qa-ai', 'state', 'init-manifest.json'), 'utf8');
    const manifest = JSON.parse(manifestRaw);
    assert.ok(manifest.entries.some((e) => e.path === 'qa-ai-output/reports/cucumber-json'));
    assert.ok(manifest.entries.some((e) => e.path === 'qa-ai-output/reports/cucumber-json/cucumber.json'));

    // 2. Export Allure
    const resAllure = await exportReport(tmp, {
      format: 'allure',
      fixedTimestamp: '1718728800000',
      fixedUuid: 'test-seed'
    });
    assert.equal(resAllure.format, 'allure');
    assert.equal(resAllure.totalCases, 1);

    // Read allure result
    const allureFile = path.join(tmp, resAllure.exportedFiles[0]);
    const allureRaw = await fs.readFile(allureFile, 'utf8');
    const allure = JSON.parse(allureRaw);
    assert.equal(allure.name, 'TC-101 Login successfully');
    assert.equal(allure.status, 'failed');
    assert.equal(allure.statusDetails.message, 'Credentials incorrect\nError: invalid credentials');
    assert.equal(allure.start, 1718728799850); // 1718728800000 - 150
    assert.equal(allure.stop, 1718728800000);
    assert.ok(allure.labels.some((l) => l.name === 'requirement' && l.value === 'RF-101'));
    assert.ok(allure.labels.some((l) => l.name === 'priority' && l.value === 'high'));

    // 3. Export JUnit XML
    const resJunit = await exportReport(tmp, {
      format: 'junit-xml'
    });
    assert.equal(resJunit.format, 'junit-xml');
    const junitRaw = await fs.readFile(path.join(tmp, resJunit.exportedFiles[0]), 'utf8');
    assert.ok(junitRaw.includes('<testsuites>'));
    assert.ok(junitRaw.includes('<testsuite name="RF-101" tests="1" failures="1"'));
    assert.ok(
      junitRaw.includes('<testcase name="TC-101 Login successfully" classname="features/login.feature" time="0.150">')
    );
    assert.ok(
      junitRaw.includes(
        '<failure message="Credentials incorrect\nError: invalid credentials"><![CDATA[Credentials incorrect\nError: invalid credentials]]></failure>'
      )
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
