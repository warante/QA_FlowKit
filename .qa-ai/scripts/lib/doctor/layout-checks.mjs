import { detectLegacyLayout } from '../project-paths.mjs';
import { relativeTo } from '../utils.mjs';

export const LEGACY_LAYOUT_MIGRATION_DOC = 'docs/qa-ai/beta-to-1.0-migration.md';

const LEGACY_LAYOUT_MESSAGE =
  'Legacy QA FlowKit layout detected: root qa-ai.config.yaml, qa-ai-output/, features/ or tests/ were found. ' +
  'No files were moved automatically. QA FlowKit remains compatible. New projects use compact layout under .qa-ai/. ' +
  'Consider migrating manually when convenient.';

/**
 * @param {string} cwd
 * @param {{ exists?: boolean, dualConfig?: boolean, source?: string, data?: object, relPath?: string }} configInfo
 */
export async function runLayoutChecks(cwd, configInfo) {
  let warned = 0;

  if (configInfo.dualConfig) {
    warned += 1;
    console.log(
      `[WARN] duplicate config: both qa-ai.config.yaml and .qa-ai/qa-ai.config.yaml exist; root config takes precedence (${configInfo.relPath || 'qa-ai.config.yaml'}).`
    );
  }

  if (configInfo.exists && (await detectLegacyLayout(cwd, configInfo))) {
    warned += 1;
    console.log(`[WARN] legacy layout: ${LEGACY_LAYOUT_MESSAGE}`);
    console.log(`[WARN] legacy layout: see ${LEGACY_LAYOUT_MIGRATION_DOC} for manual migration guidance.`);
  }

  return { warned };
}

export function collectLegacyLayoutSignals(cwd, configInfo) {
  const signals = [];
  if (configInfo.dualConfig) signals.push('duplicate-config');
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
  lines.push(`Manual migration guide: ${LEGACY_LAYOUT_MIGRATION_DOC}`);
  if (configInfo.relPath) {
    lines.push(`Active config: ${relativeTo(cwd, configInfo.path)}`);
  }
  return lines;
}
