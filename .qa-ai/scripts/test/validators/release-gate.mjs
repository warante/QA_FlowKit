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

