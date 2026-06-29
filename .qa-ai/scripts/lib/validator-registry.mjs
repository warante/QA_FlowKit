/**
 * Single source of truth for QA FlowKit validator scripts.
 * Consumed by bin/qa-flowkit.mjs, harness allowlist, validate-target, and CI starter suite.
 */

/** @typedef {{ script: string, cli?: boolean, harness?: boolean, defaultArgs?: string[], harnessDefaultArgs?: string[], starterCoreArgs?: string[] }} ValidatorEntry */

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
    starterCoreArgs: ['--allow-missing']
  },
  'validate-external-intake': {
    script: 'validate-external-intake.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing']
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
    starterCoreArgs: ['--allow-empty']
  },
  'validate-karate-features': {
    script: 'validate-karate-features.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty']
  },
  'validate-maestro-flows': {
    script: 'validate-maestro-flows.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty']
  },
  'validate-traceability': {
    script: 'validate-traceability.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty', '--allow-missing']
  },
  'validate-sync-plan': {
    script: 'validate-sync-plan.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty', '--allow-missing']
  },
  'validate-sync-diff': {
    script: 'validate-sync-diff.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing']
  },
  'validate-sync-result': {
    script: 'validate-sync-result.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing']
  },
  'validate-active-specialists': {
    script: 'validate-active-specialists.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing']
  },
  'validate-release-gate': {
    script: 'validate-release-gate.mjs',
    cli: true,
    harness: true
  },
  'validate-test-design': {
    script: 'validate-test-design.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing']
  },
  'validate-test-coverage': {
    script: 'validate-test-coverage.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-empty', '--allow-missing']
  },
  'validate-quality-report': {
    script: 'validate-quality-report.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-empty', '--allow-missing']
  },
  'validate-execution-evidence': {
    script: 'validate-execution-evidence.mjs',
    cli: true,
    harness: true,
    harnessDefaultArgs: ['--allow-missing'],
    starterCoreArgs: ['--allow-missing']
  },
  'validate-healing-log': {
    script: 'validate-healing-log.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing']
  },
  'validate-test-impact': {
    script: 'validate-test-impact.mjs',
    cli: true,
    harness: true,
    starterCoreArgs: ['--allow-missing']
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
