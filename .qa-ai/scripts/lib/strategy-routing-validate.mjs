import { specialistCatalog } from './project-config.mjs';
import { NFR_EVIDENCE_TYPES } from './nfr-coverage.mjs';
import { parseSectionTable } from './table-helpers.mjs';
import { getConfigValue, readText, pathExists, resolveRepoPath } from './utils.mjs';
import { routeStrategiesForText } from './test-strategy-router.mjs';

export const DEFAULT_CRITICAL_SIGNALS = ['gdpr', 'browserstack', 'openapi', 'sast', 'dast'];

function normalizeStrategyRoutingMode(config = {}) {
  const mode = String(getConfigValue(config, 'testDesign.strategyRouting.mode', 'off'))
    .trim()
    .toLowerCase();
  return ['off', 'advisory', 'strict'].includes(mode) ? mode : 'off';
}

/**
 * Resolve configured critical signals for strict-mode validation.
 * When omitted, uses DEFAULT_CRITICAL_SIGNALS. When set to [], no signals are treated as critical.
 * @param {object} config
 * @returns {string[]}
 */
export function resolveCriticalSignals(config = {}) {
  const raw = getConfigValue(config, 'testDesign.strategyRouting.criticalSignals', undefined);
  if (raw === undefined) return [...DEFAULT_CRITICAL_SIGNALS];
  if (!Array.isArray(raw)) return [...DEFAULT_CRITICAL_SIGNALS];
  return [...new Set(raw.map((signal) => String(signal).trim().toLowerCase()).filter(Boolean))];
}

/**
 * Validate optional ## Strategy routing decisions in the proposal when strict mode is enabled.
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateStrategyRouting(cwd, options = {}) {
  const config = options.config || {};
  const mode = options.mode || normalizeStrategyRoutingMode(config);
  if (mode !== 'strict') {
    return { ok: true, errors: [], warnings: [] };
  }

  const proposalPath =
    options.proposalPath || getConfigValue(config, 'testDesign.proposalPath', 'qa-ai-output/test-design-proposal.md');
  const absolute = resolveRepoPath(cwd, proposalPath, { label: 'test design proposal' });
  if (!(await pathExists(absolute))) {
    if (options.allowMissing) return { ok: true, errors: [], warnings: [] };
    return { ok: false, errors: [`Strategy routing validation requires proposal: ${proposalPath}`], warnings: [] };
  }

  const content = await readText(absolute);
  const table = parseSectionTable(content, 'Strategy routing decisions', [
    'RF',
    'Criterion IDs',
    'Signal',
    'Specialist(s)',
    'Decision',
    'Evidence type',
    'Rationale'
  ]);

  const errors = [...table.errors];
  if (!table.exists) {
    errors.push('Strict strategy routing requires ## Strategy routing decisions in the proposal.');
    return { ok: false, errors, warnings: [] };
  }

  for (const row of table.rows) {
    const specialists = String(row.values['specialist(s)'] || row.values.specialists || '')
      .split(/[,;]/)
      .map((value) => value.trim())
      .filter(Boolean);
    for (const specialistId of specialists) {
      const normalized = specialistId.replace(/\.md$/, '');
      if (!(normalized in specialistCatalog)) {
        errors.push(`Unknown specialist "${specialistId}" in Strategy routing decisions.`);
      }
    }
    const evidenceType = String(row.values['evidence type'] || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    if (evidenceType && !NFR_EVIDENCE_TYPES.includes(evidenceType)) {
      errors.push(`Unknown evidence type "${row.values['evidence type']}" in Strategy routing decisions.`);
    }
  }

  const routes = routeStrategiesForText(content, { config, mode: 'advisory' });
  const criticalSignals = new Set(resolveCriticalSignals(config));
  for (const route of routes) {
    if (!criticalSignals.has(String(route.signal || '').toLowerCase())) continue;
    const listed = table.rows.some((row) =>
      String(row.values['specialist(s)'] || row.values.specialists || '').includes(route.specialistId)
    );
    if (!listed) {
      errors.push(
        `Critical signal "${route.signal}" suggests ${route.specialistId} but no matching Strategy routing decisions row was found.`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings: [] };
}
