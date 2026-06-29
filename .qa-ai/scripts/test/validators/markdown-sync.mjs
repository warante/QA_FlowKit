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

test('validateTestManagementMapping: accepts correct idempotencyKey, lastAppliedAt, and lastAppliedRunId', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': {
        externalId: 'C123',
        idempotencyKey: 'idemp-1234',
        lastAppliedAt: '2026-06-18T07:44:42Z',
        lastAppliedRunId: 'run-5678'
      }
    },
    { source: 'mapping.json' }
  );
  assert.deepEqual(errors, []);
});

test('validateTestManagementMapping: rejects duplicate idempotencyKey', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { idempotencyKey: 'idemp-1234' },
      'TC-002': { idempotencyKey: 'idemp-1234' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'idempotencyKey "idemp-1234" is used by both');
});

test('validateTestManagementMapping: rejects malformed lastAppliedAt', () => {
  const errors = validateTestManagementMapping(
    {
      'TC-001': { lastAppliedAt: '2026-06-18 07:44:42' }
    },
    { source: 'mapping.json' }
  );
  assertIncludes(errors, 'field "lastAppliedAt" must be a valid ISO 8601 date string');
});
