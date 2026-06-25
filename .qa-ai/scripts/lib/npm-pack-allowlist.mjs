/**
 * Shared npm pack allowlist for verify-npm-pack, smoke-npm-pack and E2E-06.
 */

export const STABLE_COMMAND_SCRIPTS = [
  'bin/qa-flowkit.mjs',
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
  '.qa-ai/scripts/validate-config.mjs',
  '.qa-ai/scripts/validate-untrusted-content.mjs',
  '.qa-ai/scripts/validate-external-intake.mjs',
  '.qa-ai/scripts/validate-target.mjs',
  '.qa-ai/scripts/validate-features.mjs',
  '.qa-ai/scripts/validate-karate-features.mjs',
  '.qa-ai/scripts/validate-maestro-flows.mjs',
  '.qa-ai/scripts/validate-traceability.mjs',
  '.qa-ai/scripts/validate-sync-plan.mjs',
  '.qa-ai/scripts/validate-sync-diff.mjs',
  '.qa-ai/scripts/validate-sync-result.mjs',
  '.qa-ai/scripts/validate-active-specialists.mjs',
  '.qa-ai/scripts/validate-release-gate.mjs',
  '.qa-ai/scripts/validate-test-design.mjs',
  '.qa-ai/scripts/validate-test-coverage.mjs',
  '.qa-ai/scripts/validate-quality-report.mjs',
  '.qa-ai/scripts/validate-workflow-contract.mjs'
];

export const PACK_INFRASTRUCTURE = [
  'package.json',
  'README.md',
  'README.es.md',
  'LICENSE',
  '.qa-ai/contracts/config.v1.schema.json',
  '.qa-ai/contracts/workflow.v1.json',
  '.qa-ai/contracts/public-contracts.v1.json',
  '.qa-ai/contracts/cli-contracts.v1.json',
  '.qa-ai/contracts/schema-registry.v1.json',
  '.qa-ai/scripts/lib/npm-pack-allowlist.mjs',
  '.qa-ai/scripts/lib/config-schema.mjs',
  '.qa-ai/scripts/lib/injection-patterns.mjs',
  '.qa-ai/scripts/lib/harness-paths.mjs',
  '.qa-ai/scripts/lib/harness-contract.mjs',
  '.qa-ai/scripts/lib/qa-next-steps.mjs',
  '.qa-ai/scripts/lib/update-plan.mjs',
  '.qa-ai/scripts/lib/config-legacy.mjs',
  '.qa-ai/scripts/lib/cli-contract.mjs',
  '.qa-ai/rules/untrusted-content.rules.md',
  '.qa-ai/workflows/command-interaction.md',
  '.qa-ai/adapters/opencode/commands/qa-init.md',
  '.qa-ai/adapters/generic/AGENTS.md'
];

const FORBIDDEN_PREFIXES = [
  '.github/',
  '.claude/',
  '.opencode/',
  '.npm-cache/',
  'qa-ai-output/',
  'features/',
  'test/',
  'tests/',
  'actions/',
  'plugin/',
  '.claude-plugin/'
];

const FORBIDDEN_EXACT = ['qa-ai.config.yaml', '.qa-ai/state/init-manifest.json', '.qa-ai/agents/specialists/active.md'];

export function parsePackOutput(stdout) {
  const start = stdout.indexOf('[') >= 0 ? stdout.indexOf('[') : stdout.indexOf('{');
  const payload = JSON.parse(stdout.slice(start));
  const item = Array.isArray(payload) ? payload[0] : payload;
  if (!item?.filename || !Array.isArray(item.files)) {
    throw new Error('Unexpected npm pack --json output.');
  }
  return item;
}

export function validatePackFileList(files) {
  const names = files.map((file) => file.path).sort();
  const required = [...new Set([...STABLE_COMMAND_SCRIPTS, ...PACK_INFRASTRUCTURE])].sort();

  for (const relPath of required) {
    if (!names.includes(relPath)) {
      throw new Error(`Pack file list is missing required path: ${relPath}`);
    }
  }
  for (const relPath of names) {
    if (FORBIDDEN_EXACT.includes(relPath) || FORBIDDEN_PREFIXES.some((prefix) => relPath.startsWith(prefix))) {
      throw new Error(`Pack file list includes forbidden path: ${relPath}`);
    }
  }
  return names.length;
}
