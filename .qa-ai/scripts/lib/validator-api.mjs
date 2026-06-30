/**
 * Central map of in-process validator APIs for validate-target-runner.
 * Each entry: async (cwd, options) => { ok, errors, warnings, findings?, skipped? }
 */
export { validateDesignFeatures } from './gherkin-features-validate.mjs';
export { validateKarateFeatures } from './karate-features-validate.mjs';
export { validateMaestroFlowsCollection as validateMaestroFlows } from './maestro-flows-validate.mjs';
export { validateConfig } from './config-validate.mjs';
export { validateActiveSpecialists } from './active-specialists-validate.mjs';
export { validateUntrustedContent } from './untrusted-content-validate.mjs';
export { validateHealingLog } from './healing-log-validate.mjs';
export { validateTestImpact } from './test-impact-validate.mjs';
export { validateTraceability } from './traceability-matrix-validate.mjs';
export { validateReleaseGateFile } from './release-gate-validate.mjs';
export { validateExecutionEvidence } from './execution-evidence-validate.mjs';
export { validateTestCoverage } from './test-coverage-validate.mjs';
export { validateTestDesignArtifacts } from './test-design-artifacts-validate.mjs';
export { validateQualityReport } from './quality-report.mjs';
export { validateWorkflowContractFile as validateWorkflowContractApi } from './workflow-contract-validate.mjs';
export { validateSyncDiff } from './sync-diff-validate.mjs';
export { validateSyncPlan } from './sync-plan-validate.mjs';
export { validateExternalIntake } from './external-intake-validate.mjs';
export { validateStrategyRouting } from './strategy-routing-validate.mjs';

/** Convert standard validator result to JSON findings shape used by validate-target. */
export function toFindings(result) {
  const findings = [];
  for (const message of result.errors || []) {
    findings.push({ message, severity: 'error' });
  }
  for (const message of result.warnings || []) {
    findings.push({ message, severity: 'warning' });
  }
  if (Array.isArray(result.findings)) {
    for (const finding of result.findings) {
      findings.push({
        file: finding.file || finding.path || '',
        line: typeof finding.line === 'number' ? finding.line : undefined,
        message: finding.message || finding.excerpt || String(finding),
        severity: finding.severity || 'error'
      });
    }
  }
  return findings;
}
