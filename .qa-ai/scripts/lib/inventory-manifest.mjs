/**
 * Single source for packaged script inventories derived from validator-registry.
 */
import { VALIDATOR_REGISTRY, validatorScriptPath } from './validator-registry.mjs';

/** npm package CLI entry (not present in target repos after init). */
export const NPM_PACKAGE_BIN = 'bin/qa-flowkit.mjs';

/** Non-validator CLI scripts shipped in the npm package. */
export const CORE_LIFECYCLE_SCRIPTS = [
  NPM_PACKAGE_BIN,
  '.qa-ai/scripts/init.mjs',
  '.qa-ai/scripts/bootstrap-agent-adapters.mjs',
  '.qa-ai/scripts/config.mjs',
  '.qa-ai/scripts/doctor.mjs',
  '.qa-ai/scripts/clean.mjs',
  '.qa-ai/scripts/qa-help.mjs',
  '.qa-ai/scripts/qa-run.mjs',
  '.qa-ai/scripts/qa-metrics.mjs',
  '.qa-ai/scripts/export-report.mjs',
  '.qa-ai/scripts/sync-agent-adapters.mjs',
  '.qa-ai/scripts/validate-target.mjs',
  '.qa-ai/scripts/organize-features.mjs'
];

/** Harness and support libs required by doctor in target repositories. */
export const DOCTOR_HARNESS_LIB_SCRIPTS = [
  '.qa-ai/scripts/test-validators.mjs',
  '.qa-ai/scripts/smoke-test.mjs',
  '.qa-ai/scripts/smoke-npm-pack.mjs',
  '.qa-ai/scripts/lib/qa-next-steps.mjs',
  '.qa-ai/scripts/lib/harness-contract.mjs',
  '.qa-ai/scripts/lib/harness-controller.mjs',
  '.qa-ai/scripts/lib/harness-context.mjs',
  '.qa-ai/scripts/lib/harness-messages.mjs',
  '.qa-ai/scripts/lib/harness-permissions.mjs',
  '.qa-ai/scripts/lib/harness-paths.mjs',
  '.qa-ai/scripts/lib/harness-modification.mjs',
  '.qa-ai/scripts/lib/harness-run-store.mjs',
  '.qa-ai/scripts/lib/harness-validation.mjs',
  '.qa-ai/scripts/lib/harness-validator-allowlist.mjs',
  '.qa-ai/scripts/lib/custom-validators.mjs',
  '.qa-ai/scripts/lib/release-gate.mjs',
  '.qa-ai/scripts/lib/test-design.mjs',
  '.qa-ai/scripts/lib/test-coverage.mjs',
  '.qa-ai/scripts/lib/quality-report.mjs',
  '.qa-ai/scripts/lib/markdown-table.mjs',
  '.qa-ai/scripts/lib/maestro-validate.mjs',
  '.qa-ai/scripts/lib/mobile-automation.mjs',
  '.qa-ai/scripts/lib/project-config.mjs',
  '.qa-ai/scripts/lib/config-schema.mjs',
  '.qa-ai/scripts/lib/json-schema-lite.mjs',
  '.qa-ai/scripts/lib/agent-guidance-contract.mjs',
  '.qa-ai/scripts/lib/detect-adapters.mjs',
  '.qa-ai/scripts/lib/injection-patterns.mjs',
  '.qa-ai/scripts/lib/test-management-mapping.mjs',
  '.qa-ai/scripts/lib/utils.mjs'
];

/** All validator CLI scripts registered with cli: true. */
export function registryCliScripts() {
  return Object.entries(VALIDATOR_REGISTRY)
    .filter(([, entry]) => entry.cli)
    .map(([id]) => validatorScriptPath(id))
    .sort();
}

/** Scripts required by npm pack verification. */
export function packagedCommandScripts() {
  return [...new Set([...CORE_LIFECYCLE_SCRIPTS, ...registryCliScripts()])].sort();
}

/** Scripts checked by doctor framework validation. */
export function doctorRequiredScripts() {
  const targetLifecycle = CORE_LIFECYCLE_SCRIPTS.filter((relPath) => relPath !== NPM_PACKAGE_BIN);
  return [...new Set([...targetLifecycle, ...registryCliScripts(), ...DOCTOR_HARNESS_LIB_SCRIPTS])].sort();
}

/** Slash-command hosts with generated command files. */
export const ADAPTER_COMMAND_HOSTS = ['claude', 'opencode'];

/** Build expected adapter command template paths for doctor checks. */
export function adapterCommandTemplatePaths() {
  const paths = [];
  for (const host of ADAPTER_COMMAND_HOSTS) {
    const commandsDir = `.qa-ai/adapters/${host}/commands`;
    for (const name of SHARED_ADAPTER_COMMANDS) {
      paths.push(`${commandsDir}/${name}`);
    }
    for (const name of HOST_SPECIFIC_ADAPTER_COMMANDS) {
      paths.push(`${commandsDir}/${name}`);
    }
  }
  return paths.sort();
}

/** Commands rendered identically for every host from shared/commands/. */
export const SHARED_ADAPTER_COMMANDS = [
  'qa-automation-plan.md',
  'qa-clean.md',
  'qa-config.md',
  'qa-coverage.md',
  'qa-doctor.md',
  'qa-enable-enterprise.md',
  'qa-full-flow.md',
  'qa-gate.md',
  'qa-help.md',
  'qa-impact.md',
  'qa-quality.md',
  'qa-status.md',
  'qa-update-tests.md',
  'qa-validate-features.md',
  'qa-validate-karate-features.md'
];

/** Commands with host-specific placeholder substitution. */
export const HOST_SPECIFIC_ADAPTER_COMMANDS = ['qa-init.md', 'qa-add-tests.md'];
