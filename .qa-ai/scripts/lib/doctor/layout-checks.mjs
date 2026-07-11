import { detectLegacyLayout } from '../project-paths.mjs';
import { relativeTo } from '../utils.mjs';

export const LEGACY_LAYOUT_MIGRATION_DOC = 'docs/qa-ai/beta-to-1.0-migration.md';

const LEGACY_LAYOUT_MESSAGE =
  'Legacy QA FlowKit layout detected: root qa-ai.config.yaml, qa-ai-output/, features/ or tests/ were found. ' +
  'Runtime fallback is disabled. Review the migration preview and approve `qa-flowkit migrate` before continuing.';

/**
 * @param {string} cwd
 * @param {{ exists?: boolean, dualConfig?: boolean, source?: string, data?: object, relPath?: string }} configInfo
 */
export async function runLayoutChecks(cwd, configInfo, { sourceRepository = false } = {}) {
  let warned = 0;
  let failed = 0;

  if (configInfo.legacyConfigPresent && configInfo.exists) {
    warned += 1;
    console.log(
      '[WARN] duplicate config: both root legacy config and modern config exist; runtime uses only .qa-ai/qa-ai.config.yaml and migration is required.'
    );
  }

  const legacyDetected = sourceRepository
    ? Boolean(configInfo.legacyConfigPresent)
    : await detectLegacyLayout(cwd, configInfo);
  if (legacyDetected) {
    failed += 1;
    console.log(`[FAIL] legacy layout: ${LEGACY_LAYOUT_MESSAGE}`);
    console.log(`[INFO] legacy layout: run qa-flowkit migrate --dry-run, then qa-flowkit migrate after review.`);
  }

  return { warned, failed };
}

export function collectLegacyLayoutSignals(cwd, configInfo) {
  const signals = [];
  if (configInfo.legacyConfigPresent && configInfo.exists) signals.push('duplicate-config');
  if (configInfo.source === 'root') signals.push('root-config');
  return signals;
}

export function formatLegacyLayoutRecommendation(cwd, configInfo) {
  const lines = [];
  if (configInfo.dualConfig) {
    lines.push(
      `Duplicate config detected: remove or merge .qa-ai/qa-ai.config.yaml; root qa-ai.config.yaml is active (${configInfo.relPath || 'qa-ai.config.yaml'}).`
    );
  }
  lines.push(LEGACY_LAYOUT_MESSAGE);
  lines.push('Preview migration: qa-flowkit migrate --dry-run');
  if (configInfo.relPath) {
    lines.push(`Active config: ${relativeTo(cwd, configInfo.path)}`);
  }
  return lines;
}
