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
import { spawnSync } from 'node:child_process';
import { assertIncludes, repoRoot } from './_shared.mjs';

// --- validate-sync-plan (subprocess) ---

function runScript(scriptName, cwd, extraArgs = []) {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', scriptName);
  return spawnSync(process.execPath, [script, ...extraArgs], { cwd, encoding: 'utf8' });
}

test('validate-sync-plan: --json passes for a covered proposal-first plan', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-sync-plan-'));
  try {
    await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'features', 'RF-001-TC-001-login.feature'),
      'Feature: Login\n  Scenario: works\n    Given a user\n    When they log in\n    Then ok\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(tmp, 'plan.md'),
      [
        '# Sync Plan',
        '',
        'Approval required before any external writes.',
        '',
        '| ID | Proposed action | Approval status |',
        '| --- | --------------- | --------------- |',
        '| RF-001, TC-001 | Plan to create | Pending approval |',
        ''
      ].join('\n'),
      'utf8'
    );
    const res = runScript('validate-sync-plan.mjs', tmp, ['--path', 'plan.md', '--features', 'features', '--json']);
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-sync-plan: --json fails when a feature identifier is missing from the plan', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-sync-plan-bad-'));
  try {
    await fs.mkdir(path.join(tmp, 'features'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'features', 'RF-001-TC-001-login.feature'),
      'Feature: Login\n  Scenario: works\n    Given a user\n    When they log in\n    Then ok\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(tmp, 'plan.md'),
      [
        '# Sync Plan',
        '',
        'Approval required before any external writes.',
        '',
        '| ID | Proposed action | Approval status |',
        '| --- | --------------- | --------------- |',
        '| RF-001 | Plan to create | Pending approval |',
        ''
      ].join('\n'),
      'utf8'
    );
    const res = runScript('validate-sync-plan.mjs', tmp, ['--path', 'plan.md', '--features', 'features', '--json']);
    assert.equal(res.status, 1);
    const parsed = JSON.parse(res.stdout);
    assert.equal(parsed.ok, false);
    assert.ok(
      parsed.errors.some((e) => e.includes('TC-001')),
      parsed.errors.join('\n')
    );
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// --- validate-active-specialists (subprocess) ---

test('validate-active-specialists: --json --allow-missing succeeds without config', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-active-spec-'));
  try {
    const res = runScript('validate-active-specialists.mjs', tmp, ['--json', '--allow-missing']);
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-active-specialists: --json fails when config is missing', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-active-spec-bad-'));
  try {
    const res = runScript('validate-active-specialists.mjs', tmp, ['--json']);
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).ok, false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

// --- validate-maestro-flows (subprocess) ---

test('validate-maestro-flows: --json skips when Maestro is not configured', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-maestro-skip-'));
  try {
    const res = runScript('validate-maestro-flows.mjs', tmp, ['--json']);
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-maestro-flows: --json passes for a valid configured flow', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-maestro-ok-'));
  try {
    await fs.writeFile(
      path.join(tmp, 'qa-ai.config.yaml'),
      ['automation:', '  mobile:', '    framework: maestro', '    flowsPath: tests/maestro/flows', ''].join('\n'),
      'utf8'
    );
    await fs.mkdir(path.join(tmp, 'tests', 'maestro', 'flows'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'tests', 'maestro', 'flows', 'home.yaml'),
      ['appId: ${APP_ID}', '---', '- launchApp:', '    clearState: true', '- assertVisible: "Home"', ''].join('\n'),
      'utf8'
    );
    const res = runScript('validate-maestro-flows.mjs', tmp, ['--json']);
    assert.equal(res.status, 0, `Script failed: ${res.stdout}\n${res.stderr}`);
    assert.equal(JSON.parse(res.stdout).ok, true);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

test('validate-maestro-flows: --json fails for an escaping subflow path', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-maestro-bad-'));
  try {
    await fs.writeFile(
      path.join(tmp, 'qa-ai.config.yaml'),
      ['automation:', '  mobile:', '    framework: maestro', '    flowsPath: tests/maestro/flows', ''].join('\n'),
      'utf8'
    );
    await fs.mkdir(path.join(tmp, 'tests', 'maestro', 'flows'), { recursive: true });
    await fs.writeFile(
      path.join(tmp, 'tests', 'maestro', 'flows', 'home.yaml'),
      ['appId: ${APP_ID}', '---', '- runFlow: ../private.yaml', ''].join('\n'),
      'utf8'
    );
    const res = runScript('validate-maestro-flows.mjs', tmp, ['--json']);
    assert.equal(res.status, 1);
    assert.equal(JSON.parse(res.stdout).ok, false);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
