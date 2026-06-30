/**
 * Single source of truth for QA FlowKit validator scripts.
 * Consumed by bin/qa-flowkit.mjs, harness allowlist, validate-target, and CI starter suite.
 */

/** @typedef {{ script: string, cli?: boolean, harness?: boolean, defaultArgs?: string[], harnessDefaultArgs?: string[], starterCoreArgs?: string[], targetLabel?: string, targetKind?: 'inProcess'|'subprocess'|'doctor', targetWhen?: object }} ValidatorEntry */

/** Stable order for validate-target pipeline (excluding doctor, defined separately). */
export const TARGET_VALIDATOR_PIPELINE = [
  'validate-features',
  'validate-test-coverage',
  'validate-quality-report',
  'validate-karate-features',
  'validate-maestro-flows',
  'validate-sync-plan',
  'validate-sync-diff',
  'validate-sync-result',
  'validate-external-intake',
  'validate-execution-evidence',
  'validate-healing-log',
  'validate-test-impact',
  'validate-traceability',
  'validate-untrusted-content',
  'validate-active-specialists',
  'validate-release-gate',
  'validate-test-design'
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
  }
};

/** @type {readonly string[]} Stable order for starter-core validator node steps. */
export const STARTER_CORE_VALIDATOR_ORDER = [
  'validate-config',
  'validate-untrusted-content',
  'validate-external-intake',
  'validate-workflow-contract',
  'validate-features',
  'validate-test-coverage',
  'validate-quality-report',
  'validate-karate-features',
  'validate-maestro-flows',
  'validate-traceability',
  'validate-sync-plan',
  'validate-sync-diff',
  'validate-sync-result',
  'validate-active-specialists',
  'validate-execution-evidence',
  'validate-healing-log',
  'validate-test-impact'
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
