/**
 * Shared npm pack allowlist for verify-npm-pack, smoke-npm-pack and E2E-06.
 */
import { packagedCommandScripts } from './inventory-manifest.mjs';

export const STABLE_COMMAND_SCRIPTS = packagedCommandScripts();

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

const FORBIDDEN_EXACT = [
  'qa-ai.config.yaml',
  '.qa-ai/qa-ai.config.yaml',
  '.qa-ai/state/init-manifest.json',
  '.qa-ai/agents/specialists/active.md'
];

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
