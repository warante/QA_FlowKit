export const VALIDATOR_ALLOWLIST = {
  'validate-features': {
    script: '.qa-ai/scripts/validate-features.mjs',
    defaultArgs: []
  },
  'validate-traceability': {
    script: '.qa-ai/scripts/validate-traceability.mjs',
    defaultArgs: []
  },
  'validate-sync-plan': {
    script: '.qa-ai/scripts/validate-sync-plan.mjs',
    defaultArgs: []
  },
  'validate-test-design': {
    script: '.qa-ai/scripts/validate-test-design.mjs',
    defaultArgs: ['--allow-missing']
  },
  'validate-test-coverage': {
    script: '.qa-ai/scripts/validate-test-coverage.mjs',
    defaultArgs: ['--allow-missing']
  },
  'validate-quality-report': {
    script: '.qa-ai/scripts/validate-quality-report.mjs',
    defaultArgs: []
  },
  'validate-release-gate': {
    script: '.qa-ai/scripts/validate-release-gate.mjs',
    defaultArgs: []
  },
  'validate-karate-features': {
    script: '.qa-ai/scripts/validate-karate-features.mjs',
    defaultArgs: []
  },
  'validate-sync-diff': {
    script: '.qa-ai/scripts/validate-sync-diff.mjs',
    defaultArgs: []
  },
  'validate-sync-result': {
    script: '.qa-ai/scripts/validate-sync-result.mjs',
    defaultArgs: []
  },
  'validate-external-intake': {
    script: '.qa-ai/scripts/validate-external-intake.mjs',
    defaultArgs: ['--allow-missing']
  },
  'validate-execution-evidence': {
    script: '.qa-ai/scripts/validate-execution-evidence.mjs',
    defaultArgs: ['--allow-missing']
  },
  'validate-healing-log': {
    script: '.qa-ai/scripts/validate-healing-log.mjs',
    defaultArgs: []
  },
  'validate-test-impact': {
    script: '.qa-ai/scripts/validate-test-impact.mjs',
    defaultArgs: []
  }
};

export function isValidatorAllowed(validatorId) {
  return Object.hasOwn(VALIDATOR_ALLOWLIST, validatorId);
}
