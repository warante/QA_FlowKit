/**
 * Single source of truth for QA FlowKit validator scripts.
 * Consumed by bin/qa-flowkit.mjs, harness allowlist, validate-target, and CI starter suite.
 */

/** @typedef {{ script: string, cli?: boolean, harness?: boolean, defaultArgs?: string[], harnessDefaultArgs?: string[], starterCoreArgs?: string[], targetLabel?: string, targetKind?: 'inProcess'|'subprocess'|'doctor', targetWhen?: object }} ValidatorEntry */

/** Stable order for validate-target pipeline (excluding doctor, defined separately). */
export const TARGET_VALIDATOR_PIPELINE = [
  'validate-features',
  'validate-risk-analysis',
  'validate-test-coverage',
  'validate-quality-report',
  'validate-karate-features',
  'validate-maestro-flows',
  'validate-sync-plan',
  'validate-sync-diff',
  'validate-sync-result',
  'validate-external-intake',
  'validate-test-data-plan',
  'validate-environment-readiness',
  'validate-execution-plan',
  'validate-execution-evidence',
  'validate-execution-summary',
  'validate-healing-log',
  'validate-test-impact',
  'validate-result-analysis',
  'validate-defect-triage',
  'validate-observability-intake',
  'validate-learning-log',
  'validate-traceability',
  'validate-untrusted-content',
  'validate-active-specialists',
  'validate-release-gate',
  'validate-test-design',
  'validate-strategy-routing'
];

/** @type {Record<string, ValidatorEntry>} */
export const VALIDATOR_REGISTRY = {
  'validate-config': {
    script: 'validate-config.mjs',
    cli: true,
    starterCoreArgs: ['--allow-missing']
  },
  'validate-untrusted-content': {
    script: 'validate-untrusted-content.mjs',
    cli: true,
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'untrusted content scan',
    targetKind: 'inProcess'
  },
  'validate-external-intake': {
    script: 'validate-external-intake.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'external intake validation',
    targetKind: 'inProcess',
    targetWhen: { externalIntake: true }
  },
  'validate-workflow-contract': {
    script: 'validate-workflow-contract.mjs',
    starterCoreArgs: []
  },
  'validate-target': {
    script: 'validate-target.mjs',
    cli: true
  },
  'validate-features': {
    script: 'validate-features.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty'],
    targetLabel: 'feature validation',
    targetKind: 'inProcess'
  },
  'validate-karate-features': {
    script: 'validate-karate-features.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty'],
    targetLabel: 'karate feature validation',
    targetKind: 'inProcess',
    targetWhen: { usesKarate: true }
  },
  'validate-maestro-flows': {
    script: 'validate-maestro-flows.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty'],
    targetLabel: 'Maestro flow validation',
    targetKind: 'inProcess',
    targetWhen: { usesMaestro: true }
  },
  'validate-traceability': {
    script: 'validate-traceability.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty', '--allow-missing'],
    targetLabel: 'traceability validation',
    targetKind: 'inProcess'
  },
  'validate-sync-plan': {
    script: 'validate-sync-plan.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty', '--allow-missing'],
    targetLabel: 'sync plan validation',
    targetKind: 'inProcess',
    targetWhen: { tracksExclude: ['quick'] }
  },
  'validate-sync-diff': {
    script: 'validate-sync-diff.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'sync diff validation',
    targetKind: 'inProcess',
    targetWhen: { tracksExclude: ['quick'], syncMode: 'governed' }
  },
  'validate-sync-result': {
    script: 'validate-sync-result.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'sync result validation',
    targetKind: 'subprocess',
    targetWhen: { tracksExclude: ['quick'], syncMode: 'governed' }
  },
  'validate-active-specialists': {
    script: 'validate-active-specialists.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'active specialist validation',
    targetKind: 'inProcess'
  },
  'validate-release-gate': {
    script: 'validate-release-gate.mjs',
    cli: true,
    harness: true,
    targetLabel: 'release gate validation',
    targetKind: 'inProcess',
    targetWhen: { enterpriseTrack: true, skipFlag: 'skip-release-gate' }
  },
  'validate-test-design': {
    script: 'validate-test-design.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    targetLabel: 'test design validation',
    targetKind: 'inProcess',
    targetWhen: { designTracks: ['standard', 'enterprise'], skipFlag: 'skip-test-design' }
  },
  'validate-strategy-routing': {
    script: 'validate-strategy-routing.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    targetLabel: 'strategy routing validation',
    targetKind: 'inProcess',
    targetWhen: {
      designTracks: ['standard', 'enterprise'],
      configMode: 'testDesign.strategyRouting.mode',
      configModeIs: 'strict',
      skipFlag: 'skip-strategy-routing'
    }
  },
  'validate-test-coverage': {
    script: 'validate-test-coverage.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-empty', '--allow-missing'],
    targetLabel: 'test coverage validation',
    targetKind: 'inProcess',
    targetWhen: { coverageModeNotOff: true, skipFlag: 'skip-test-coverage' }
  },
  'validate-quality-report': {
    script: 'validate-quality-report.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty', '--allow-missing'],
    targetLabel: 'Gherkin quality report validation',
    targetKind: 'inProcess',
    targetWhen: { tracksExclude: ['quick'], qualityModeNotOff: true, skipFlag: 'skip-quality-report' }
  },
  'validate-execution-evidence': {
    script: 'validate-execution-evidence.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'execution evidence validation',
    targetKind: 'inProcess',
    targetWhen: { executionPaths: true }
  },
  'validate-healing-log': {
    script: 'validate-healing-log.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'governed healing validation',
    targetKind: 'inProcess',
    targetWhen: { artifactExists: 'healingLog' }
  },
  'validate-test-impact': {
    script: 'validate-test-impact.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'test impact validation',
    targetKind: 'inProcess',
    targetWhen: { artifactExists: 'testImpactAnalysis' }
  },
  'validate-risk-analysis': {
    script: 'validate-risk-analysis.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'risk analysis validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'risk.mode', configModeNot: 'off' }
  },
  'validate-test-data-plan': {
    script: 'validate-test-data-plan.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'test data plan validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'testData.mode', configModeNot: 'off' }
  },
  'validate-environment-readiness': {
    script: 'validate-environment-readiness.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'environment readiness validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'environments.mode', configModeNot: 'off' }
  },
  'validate-execution-plan': {
    script: 'validate-execution-plan.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'execution plan validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'execution.mode', configModeNot: 'off' }
  },
  'validate-execution-summary': {
    script: 'validate-execution-summary.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'execution summary validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'execution.mode', configModeNot: 'off' }
  },
  'validate-result-analysis': {
    script: 'validate-result-analysis.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'result analysis validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'execution.mode', configModeNot: 'off' }
  },
  'validate-defect-triage': {
    script: 'validate-defect-triage.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'defect triage validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'execution.mode', configModeNot: 'off' }
  },
  'validate-observability-intake': {
    script: 'validate-observability-intake.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'observability intake validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'observability.mode', configModeNot: 'off' }
  },
  'validate-learning-log': {
    script: 'validate-learning-log.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing'],
    targetLabel: 'learning log validation',
    targetKind: 'inProcess',
    targetWhen: { configMode: 'learningLoop.mode', configModeNot: 'off' }
  }
};

/** @type {readonly string[]} Stable order for starter-core validator node steps. */
export const STARTER_CORE_VALIDATOR_ORDER = [
  'validate-config',
  'validate-untrusted-content',
  'validate-external-intake',
  'validate-workflow-contract',
  'validate-features',
  'validate-risk-analysis',
  'validate-test-coverage',
  'validate-quality-report',
  'validate-karate-features',
  'validate-maestro-flows',
  'validate-traceability',
  'validate-sync-plan',
  'validate-sync-diff',
  'validate-sync-result',
  'validate-active-specialists',
  'validate-test-data-plan',
  'validate-environment-readiness',
  'validate-execution-plan',
  'validate-execution-evidence',
  'validate-execution-summary',
  'validate-healing-log',
  'validate-test-impact',
  'validate-result-analysis',
  'validate-defect-triage',
  'validate-observability-intake',
  'validate-learning-log'
];

export function validatorScriptPath(id) {
  const entry = VALIDATOR_REGISTRY[id];
  if (!entry) throw new Error(`Unknown validator: ${id}`);
  return `.qa-ai/scripts/${entry.script}`;
}

export function cliValidatorCommandMap() {
  return Object.fromEntries(
    Object.entries(VALIDATOR_REGISTRY)
      .filter(([, entry]) => entry.cli)
      .map(([id, entry]) => [id, entry.script])
  );
}

export function harnessValidatorAllowlist() {
  return Object.fromEntries(
    Object.entries(VALIDATOR_REGISTRY)
      .filter(([, entry]) => entry.harness)
      .map(([id, entry]) => [
        id,
        {
          script: validatorScriptPath(id),
          defaultArgs: entry.harnessDefaultArgs ?? entry.defaultArgs ?? []
        }
      ])
  );
}

export function isValidatorAllowed(validatorId) {
  return VALIDATOR_REGISTRY[validatorId]?.harness === true;
}

/** @returns {{ type: 'node', file: string, args?: string[] }[]} */
export function starterCoreValidatorSteps() {
  return STARTER_CORE_VALIDATOR_ORDER.filter((id) => VALIDATOR_REGISTRY[id]?.starterCoreArgs !== undefined).map(
    (id) => ({
      type: 'node',
      file: validatorScriptPath(id),
      args: VALIDATOR_REGISTRY[id].starterCoreArgs
    })
  );
}
