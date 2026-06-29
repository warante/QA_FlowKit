/** @typedef {{ type: 'npm', script: string, args?: string[] }} NpmStep */
/** @typedef {{ type: 'node', file: string, args?: string[] }} NodeStep */
/** @typedef {NpmStep | NodeStep} ValidateStep */

/** @type {ValidateStep[]} */
export const VALIDATE_E2E_STEPS = [
  { type: 'npm', script: 'test:npm-release-age-policy' },
  { type: 'npm', script: 'test:npm-release-age-policy:unit' },
  { type: 'npm', script: 'test:readiness-audit' },
  { type: 'npm', script: 'test:readiness-audit:unit' },
  { type: 'npm', script: 'test:release-policy' },
  { type: 'npm', script: 'test:release-policy:unit' },
  { type: 'npm', script: 'test:e2e-release-dry-run' },
  { type: 'npm', script: 'test:rc-post-publish', args: ['--local-simulation'] },
  { type: 'npm', script: 'test:rc-post-publish:unit' },
  { type: 'npm', script: 'test:rc-soak' },
  { type: 'npm', script: 'test:rc-soak:unit' },
  { type: 'npm', script: 'test:stable-release-approval' },
  { type: 'npm', script: 'test:stable-release-approval:unit' },
  { type: 'npm', script: 'test:stable-release-config' },
  { type: 'npm', script: 'test:stable-release-config:unit' },
  { type: 'npm', script: 'test:e2e-stable-config-rehearsal' },
  { type: 'npm', script: 'test:stable-release-pr' },
  { type: 'npm', script: 'test:stable-release-pr:unit' },
  { type: 'npm', script: 'test:e2e-stable-release-pr-rehearsal' },
  { type: 'npm', script: 'test:stable-post-publish', args: ['--local-simulation'] },
  { type: 'npm', script: 'test:stable-post-publish:unit' },
  { type: 'npm', script: 'test:stable-post-publish-status' },
  { type: 'npm', script: 'test:stable-announcement' },
  { type: 'npm', script: 'test:stable-announcement:unit' },
  { type: 'npm', script: 'test:e2e-quick' },
  { type: 'npm', script: 'test:product-demo' },
  { type: 'npm', script: 'test:product-demo:unit' },
  { type: 'npm', script: 'test:e2e-manual-example' },
  { type: 'npm', script: 'test:e2e-karate' },
  { type: 'npm', script: 'test:e2e-playwright' },
  { type: 'npm', script: 'test:e2e-mobile' },
  { type: 'npm', script: 'test:e2e-adversarial' },
  { type: 'npm', script: 'test:adversarial-failure' },
  { type: 'npm', script: 'test:e2e-update-migration' },
  { type: 'npm', script: 'test:update-migration' },
  { type: 'npm', script: 'test:e2e-clean-install' },
  { type: 'npm', script: 'test:clean-install' }
];

/** @type {ValidateStep[]} */
export const VALIDATE_CORE_STEPS = [
  { type: 'npm', script: 'docs:check' },
  { type: 'npm', script: 'test:doc-consistency' },
  { type: 'npm', script: 'contracts:check' },
  { type: 'npm', script: 'test:compatibility-fixtures' },
  { type: 'npm', script: 'test:compatibility-fixtures:unit' },
  { type: 'npm', script: 'test:adapter-support' },
  { type: 'npm', script: 'test:required-checks' },
  { type: 'npm', script: 'test:gherkin-quality-dataset' },
  { type: 'npm', script: 'test:pilot-metrics' },
  { type: 'npm', script: 'pilots:analyze' },
  { type: 'npm', script: 'test:threat-model' },
  { type: 'npm', script: 'test:cli-contracts' },
  { type: 'npm', script: 'test:cli-contracts:unit' },
  { type: 'npm', script: 'test:example-compatibility' },
  { type: 'node', file: '.qa-ai/scripts/doctor.mjs' },
  { type: 'node', file: '.qa-ai/scripts/validate-config.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-untrusted-content.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-external-intake.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-workflow-contract.mjs' },
  { type: 'node', file: '.qa-ai/scripts/validate-features.mjs', args: ['--allow-empty'] },
  {
    type: 'node',
    file: '.qa-ai/scripts/validate-test-coverage.mjs',
    args: ['--allow-empty', '--allow-missing']
  },
  {
    type: 'node',
    file: '.qa-ai/scripts/validate-quality-report.mjs',
    args: ['--allow-empty', '--allow-missing']
  },
  { type: 'node', file: '.qa-ai/scripts/validate-karate-features.mjs', args: ['--allow-empty'] },
  { type: 'node', file: '.qa-ai/scripts/validate-maestro-flows.mjs', args: ['--allow-empty'] },
  {
    type: 'node',
    file: '.qa-ai/scripts/validate-traceability.mjs',
    args: ['--allow-empty', '--allow-missing']
  },
  { type: 'node', file: '.qa-ai/scripts/validate-sync-plan.mjs', args: ['--allow-empty', '--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-sync-diff.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-sync-result.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-active-specialists.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-execution-evidence.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-healing-log.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/validate-test-impact.mjs', args: ['--allow-missing'] },
  { type: 'node', file: '.qa-ai/scripts/test-validators.mjs' },
  { type: 'node', file: '.qa-ai/scripts/test-harness.mjs' },
  { type: 'node', file: '.qa-ai/scripts/test-cli-integration.mjs' },
  { type: 'node', file: '.qa-ai/scripts/test-hooks.mjs' },
  { type: 'node', file: '.qa-ai/scripts/smoke-test.mjs' },
  { type: 'node', file: '.qa-ai/scripts/smoke-npm-pack.mjs' }
];

/** @type {Record<string, ValidateStep[]>} */
export const VALIDATE_SUITES = {
  core: VALIDATE_CORE_STEPS,
  e2e: VALIDATE_E2E_STEPS,
  full: [...VALIDATE_CORE_STEPS, ...VALIDATE_E2E_STEPS]
};

export function stepLabel(step) {
  if (step.type === 'npm') {
    const args = step.args?.length ? ` ${step.args.join(' ')}` : '';
    return `npm run ${step.script}${args}`;
  }
  const args = step.args?.length ? ` ${step.args.join(' ')}` : '';
  return `node ${step.file}${args}`;
}
