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
  'validate-release-gate': {
    script: '.qa-ai/scripts/validate-release-gate.mjs',
    defaultArgs: []
  },
  'validate-karate-features': {
    script: '.qa-ai/scripts/validate-karate-features.mjs',
    defaultArgs: []
  }
};

export function isValidatorAllowed(validatorId) {
  return Object.hasOwn(VALIDATOR_ALLOWLIST, validatorId);
}
