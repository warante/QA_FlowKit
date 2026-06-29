/** Root directory for generated QA workflow artifacts in target repositories. */
export const QA_OUTPUT_DIR = 'qa-ai-output';

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
  testManagementRemoteSnapshotPost: `${QA_OUTPUT_DIR}/test-management-remote-snapshot.post.md`,
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

export const DEFAULT_TEST_MANAGEMENT_SYNC_PLAN_PATH = ARTIFACT_PATHS.testManagementSyncPlan;

/** Backward-compatible artifact path aliases (old testrail-* names → test-management-* names). */
export const LEGACY_ARTIFACT_ALIASES = new Map([
  ['qa-ai-output/testrail-sync-plan.md', ARTIFACT_PATHS.testManagementSyncPlan],
  ['qa-ai-output/testrail-coverage-analysis.md', ARTIFACT_PATHS.testManagementCoverage]
]);
