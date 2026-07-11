import {
  COMPACT_FEATURES_DIR,
  COMPACT_OUTPUT_DIR,
  COMPACT_TESTS_DIR,
  LEGACY_FEATURES_DIR,
  LEGACY_OUTPUT_DIR,
  LEGACY_TESTS_DIR
} from './project-paths.mjs';

/** Default root directory for generated QA workflow artifacts in new target repositories. */
export const QA_OUTPUT_DIR = COMPACT_OUTPUT_DIR;

/** Legacy output directory used only for detection and explicit migration planning. */
export const LEGACY_QA_OUTPUT_DIR = LEGACY_OUTPUT_DIR;

/** Default relative artifact paths under {@link QA_OUTPUT_DIR}. */
export const ARTIFACT_PATHS = {
  requirementAnalysis: `${QA_OUTPUT_DIR}/requirement-analysis.md`,
  normalizedRequirements: `${QA_OUTPUT_DIR}/normalized-requirements.md`,
  sourceAnalysis: `${QA_OUTPUT_DIR}/source-analysis.md`,
  testDesignSystem: `${QA_OUTPUT_DIR}/test-design-system.md`,
  testDesignProposal: `${QA_OUTPUT_DIR}/test-design-proposal.md`,
  traceabilityMatrix: `${QA_OUTPUT_DIR}/traceability-matrix.md`,
  prSummary: `${QA_OUTPUT_DIR}/pr-summary.md`,
  releaseGate: `${QA_OUTPUT_DIR}/release-gate.yaml`,
  healingLog: `${QA_OUTPUT_DIR}/healing-log.md`,
  testImpactAnalysis: `${QA_OUTPUT_DIR}/test-impact-analysis.md`,
  testManagementCoverage: `${QA_OUTPUT_DIR}/test-management-coverage-analysis.md`,
  testManagementSyncPlan: `${QA_OUTPUT_DIR}/test-management-sync-plan.md`,
  testManagementSyncDiff: `${QA_OUTPUT_DIR}/test-management-sync-diff.md`,
  testManagementApplyLog: `${QA_OUTPUT_DIR}/test-management-apply-log.md`,
  testManagementRollback: `${QA_OUTPUT_DIR}/test-management-rollback-plan.md`,
  testManagementRemoteSnapshot: `${QA_OUTPUT_DIR}/test-management-remote-snapshot.md`,
  testManagementRemoteSnapshotPre: `${QA_OUTPUT_DIR}/test-management-remote-snapshot.pre.md`,
  testManagementRemoteSnapshotPost: `${QA_OUTPUT_DIR}/test-management-remote-snapshot.post.md`,
  testManagementRemoteSnapshotPreApply: `${QA_OUTPUT_DIR}/test-management-remote-snapshot.pre-apply.md`,
  testManagementRemoteSnapshotPostApply: `${QA_OUTPUT_DIR}/test-management-remote-snapshot.post-apply.md`,
  testManagementMapping: `${QA_OUTPUT_DIR}/test-management-mapping.json`,
  automationFeasibility: `${QA_OUTPUT_DIR}/automation-feasibility-report.md`,
  automationImplementation: `${QA_OUTPUT_DIR}/automation-implementation-plan.md`,
  jiraAutomationTask: `${QA_OUTPUT_DIR}/jira-automation-task.md`,
  gherkinQualityReport: `${QA_OUTPUT_DIR}/gherkin-quality-report.md`,
  qaKnowledgeSummary: `${QA_OUTPUT_DIR}/qa-knowledge-summary.md`,
  qaInitDecisions: `${QA_OUTPUT_DIR}/qa-init-decisions.md`,
  importedRequirements: `${QA_OUTPUT_DIR}/imported-requirements.md`,
  importedCases: `${QA_OUTPUT_DIR}/imported-cases.md`
};

export const DEFAULT_FEATURE_PATH = COMPACT_FEATURES_DIR;
export const DEFAULT_TESTS_ROOT = COMPACT_TESTS_DIR;

export const DEFAULT_TEST_MANAGEMENT_SYNC_PLAN_PATH = ARTIFACT_PATHS.testManagementSyncPlan;

function legacyArtifactAliases() {
  const aliases = new Map([
    ['qa-ai-output/testrail-sync-plan.md', ARTIFACT_PATHS.testManagementSyncPlan],
    ['qa-ai-output/testrail-coverage-analysis.md', ARTIFACT_PATHS.testManagementCoverage]
  ]);

  for (const [, value] of Object.entries(ARTIFACT_PATHS)) {
    const legacyPath = value.replace(`${COMPACT_OUTPUT_DIR}/`, `${LEGACY_OUTPUT_DIR}/`);
    if (legacyPath !== value) {
      aliases.set(legacyPath, value);
    }
  }

  return aliases;
}

/** Legacy-to-modern mappings used only by detection and migration; runtime resolution never falls back to them. */
export const LEGACY_ARTIFACT_ALIASES = legacyArtifactAliases();

/**
 * Resolve an artifact path in the same directory as a configured reference path.
 * Keeps related modern artifact paths in the configured output directory.
 */
export function siblingArtifactPath(referencePath, fileName) {
  const normalized = String(referencePath || '').replaceAll('\\', '/');
  const slash = normalized.lastIndexOf('/');
  if (slash === -1) return fileName;
  return `${normalized.slice(0, slash)}/${fileName}`;
}

export { LEGACY_FEATURES_DIR, LEGACY_OUTPUT_DIR, LEGACY_TESTS_DIR };
