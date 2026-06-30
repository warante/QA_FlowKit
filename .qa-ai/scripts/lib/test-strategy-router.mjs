import { getConfigValue } from './utils.mjs';
import { slug, specialistCatalog, specialistsForNfrAttributes } from './project-config.mjs';
import { NFR_EVIDENCE_TYPES } from './nfr-coverage.mjs';

export const STRATEGY_ROUTING_MODES = ['off', 'advisory', 'strict'];

/** Keyword/signal routing rules derived from docs/qa-ai/specialist-routing-matrix.md */
export const STRATEGY_ROUTING_RULES = [
  {
    id: 'exploratory',
    specialists: ['exploratory-testing-agent'],
    evidenceTypes: ['manual-charter'],
    signals: [
      'unknown behavior',
      'legacy',
      'incident',
      'defect-prone',
      'broad workflow',
      'vague',
      'exploratory',
      'session-based',
      'charter'
    ]
  },
  {
    id: 'test-data',
    specialists: ['test-data-agent'],
    evidenceTypes: ['test-plan', 'automation-script'],
    signals: [
      'fixture',
      'seed',
      'synthetic data',
      'test data',
      'data setup',
      'cleanup',
      'historical data',
      'permissions matrix'
    ]
  },
  {
    id: 'contract',
    specialists: ['contract-testing-agent'],
    evidenceTypes: ['automation-script', 'test-plan'],
    signals: [
      'openapi',
      'asyncapi',
      'webhook',
      'consumer',
      'provider',
      'pact',
      'schema contract',
      'bff',
      'sdk contract'
    ]
  },
  {
    id: 'visual-regression',
    specialists: ['visual-regression-agent'],
    evidenceTypes: ['automation-script', 'manual-charter'],
    signals: [
      'figma',
      'redesign',
      'layout',
      'screenshot',
      'visual regression',
      'theme',
      'design parity',
      'responsive layout'
    ]
  },
  {
    id: 'data-quality',
    specialists: ['data-quality-agent'],
    evidenceTypes: ['automation-script', 'test-plan'],
    signals: [
      'reconciliation',
      'etl',
      'duplicate',
      'report data',
      'export data',
      'import data',
      'data quality',
      'audit data'
    ]
  },
  {
    id: 'database-migration',
    specialists: ['database-migration-agent'],
    evidenceTypes: ['test-plan', 'automation-script', 'residual-risk'],
    signals: [
      'schema change',
      'backfill',
      'database migration',
      'migration script',
      'index change',
      'retention migration'
    ]
  },
  {
    id: 'observability',
    specialists: ['observability-testing-agent'],
    evidenceTypes: ['technical-review', 'automation-script'],
    signals: ['metrics', 'tracing', 'trace', 'alert', 'audit event', 'monitoring', 'observability', 'structured log']
  },
  {
    id: 'post-deploy',
    specialists: ['post-deploy-validation-agent'],
    evidenceTypes: ['test-plan', 'technical-review'],
    signals: [
      'post deploy',
      'post-deploy',
      'canary',
      'feature flag rollout',
      'production smoke',
      'deployment validation',
      'synthetic monitor'
    ]
  },
  {
    id: 'security-advanced',
    specialists: ['security-advanced-agent'],
    evidenceTypes: ['technical-review', 'automation-script', 'residual-risk'],
    signals: [
      'sast',
      'dast',
      'dependency scan',
      'secret scan',
      'supply chain',
      'penetration test',
      'pentest',
      'owasp scan',
      'vulnerability scan'
    ]
  },
  {
    id: 'threat-model',
    specialists: ['threat-modeling-agent'],
    evidenceTypes: ['technical-review'],
    signals: ['threat model', 'threat-model', 'stride', 'abuse case', 'misuse case', 'trust boundary', 'attacker']
  },
  {
    id: 'performance-execution',
    specialists: ['performance-execution-agent'],
    evidenceTypes: ['automation-script'],
    signals: ['k6', 'jmeter', 'gatling', 'load test execution', 'stress test execution', 'soak test', 'p95', 'sla run']
  },
  {
    id: 'resilience-chaos',
    specialists: ['resilience-chaos-agent'],
    evidenceTypes: ['test-plan', 'residual-risk'],
    signals: ['chaos', 'failover', 'disaster recovery', 'circuit breaker', 'timeout injection', 'retry storm']
  },
  {
    id: 'cross-browser-device',
    specialists: ['cross-browser-device-agent'],
    evidenceTypes: ['test-plan', 'manual-charter', 'automation-script'],
    signals: [
      'browser matrix',
      'device matrix',
      'cross-browser',
      'cross-device',
      'viewport',
      'responsive matrix',
      'os matrix'
    ]
  },
  {
    id: 'browserstack',
    specialists: ['browserstack-strategy-agent'],
    evidenceTypes: ['automation-script', 'manual-charter'],
    signals: ['browserstack', 'sauce labs', 'lambdatest', 'device cloud', 'app automate', 'appium cloud']
  },
  {
    id: 'i18n-l10n',
    specialists: ['i18n-l10n-agent'],
    evidenceTypes: ['feature', 'manual-charter'],
    signals: ['localization', 'internationalization', 'locale', 'timezone', 'currency format', 'rtl', 'i18n', 'l10n']
  },
  {
    id: 'analytics',
    specialists: ['analytics-tracking-agent'],
    evidenceTypes: ['automation-script', 'feature'],
    signals: ['tracking', 'telemetry', 'funnel', 'posthog', 'plausible', 'segment', 'amplitude', 'analytics event']
  },
  {
    id: 'compliance',
    specialists: ['compliance-testing-agent'],
    evidenceTypes: ['technical-review'],
    signals: ['regulatory', 'soc2', 'iso27001', 'pci', 'eidas', 'compliance audit', 'legal control']
  },
  {
    id: 'privacy',
    specialists: ['privacy-testing-agent'],
    evidenceTypes: ['feature', 'technical-review', 'automation-script'],
    signals: [
      'gdpr',
      'pii',
      'consent',
      'cookie',
      'data deletion',
      'data export',
      'biometric',
      'privacy policy',
      'personal data'
    ]
  }
];

function normalizeStrategyRoutingMode(config = {}) {
  const mode = String(getConfigValue(config, 'testDesign.strategyRouting.mode', 'off'))
    .trim()
    .toLowerCase();
  return STRATEGY_ROUTING_MODES.includes(mode) ? mode : 'off';
}

function includeKeywordSignals(config = {}) {
  return getConfigValue(config, 'testDesign.strategyRouting.includeKeywordSignals', true) !== false;
}

function maxSpecialistsPerCriterion(config = {}) {
  const value = Number(getConfigValue(config, 'testDesign.strategyRouting.maxSpecialistsPerCriterion', 5));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
}

function matchSignal(text, signal) {
  const haystack = String(text || '').toLowerCase();
  const needle = String(signal || '').toLowerCase();
  if (!needle) return false;
  if (needle.length <= 3) {
    return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(haystack);
  }
  return haystack.includes(needle);
}

function dedupeRoutes(routes) {
  const seen = new Set();
  const output = [];
  for (const route of routes) {
    const key = `${route.specialistId}::${route.signal}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(route);
  }
  return output;
}

/**
 * Route specialists from free text (RF/CA/NFR wording).
 * @returns {Array<{ specialistId, signal, evidenceTypes, rationale, advisory: boolean }>}
 */
export function routeStrategiesForText(text, options = {}) {
  const config = options.config || {};
  const mode = options.mode || normalizeStrategyRoutingMode(config);
  if (mode === 'off' || !includeKeywordSignals(config)) return [];

  const advisory = mode !== 'strict';
  const limit = options.maxSpecialists ?? maxSpecialistsPerCriterion(config);
  const routes = [];

  for (const rule of STRATEGY_ROUTING_RULES) {
    for (const signal of rule.signals) {
      if (!matchSignal(text, signal)) continue;
      for (const specialistId of rule.specialists) {
        if (!specialistCatalog[specialistId]) continue;
        routes.push({
          specialistId,
          signal,
          evidenceTypes: [...rule.evidenceTypes],
          rationale: `Matched keyword signal "${signal}" for rule ${rule.id}.`,
          advisory
        });
      }
    }
  }

  // BrowserStack also suggests cross-browser/device when cloud execution is explicit.
  if (matchSignal(text, 'browserstack') || matchSignal(text, 'device cloud')) {
    const crossBrowser = specialistCatalog['cross-browser-device-agent'];
    if (crossBrowser) {
      routes.push({
        specialistId: 'cross-browser-device-agent',
        signal: 'device cloud',
        evidenceTypes: ['test-plan', 'automation-script'],
        rationale: 'Cloud device/browser execution implies a compatibility matrix.',
        advisory
      });
    }
  }

  return dedupeRoutes(routes).slice(0, limit);
}

/**
 * Route specialists for a normalized requirement object.
 * @param {{ rf?: string, criteria?: string[], nfrText?: string, body?: string }} requirement
 */
export function routeStrategiesForRequirement(requirement = {}, options = {}) {
  const parts = [requirement.body, requirement.nfrText, ...(requirement.criteria || [])].filter(Boolean);
  const text = parts.join('\n');
  const routes = routeStrategiesForText(text, options);
  return routes.map((route) => ({
    ...route,
    rf: requirement.rf || ''
  }));
}

/**
 * Merge NFR attribute specialists with keyword-routed specialists.
 */
export function mergeRoutedSpecialists(nfrSpecialists = [], routedSpecialists = []) {
  const active = new Map();
  for (const [id, details] of nfrSpecialists) {
    active.set(id, details);
  }
  for (const route of routedSpecialists) {
    const details = specialistCatalog[route.specialistId];
    if (details) active.set(route.specialistId, details);
  }
  return [...active.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Config-driven on-demand specialists (BrowserStack, device matrix aliases).
 */
export function specialistsFromConfig(config = {}) {
  const active = new Map();
  const uiFramework = slug(getConfigValue(config, 'automation.ui.framework', ''));
  const mobileFramework = slug(getConfigValue(config, 'automation.mobile.framework', ''));

  if (uiFramework.includes('browserstack') || mobileFramework.includes('browserstack')) {
    active.set('browserstack-strategy-agent', specialistCatalog['browserstack-strategy-agent']);
    active.set('cross-browser-device-agent', specialistCatalog['cross-browser-device-agent']);
  }

  return [...active.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * Combined routing from NFR attributes, config and requirement text.
 */
export function routeSpecialistsForContext({ config = {}, nfrAttributes = [], requirement = {} } = {}) {
  const nfrSpecialists = specialistsForNfrAttributes(nfrAttributes);
  const configSpecialists = specialistsFromConfig(config);
  const keywordRoutes = routeStrategiesForRequirement(requirement, { config });
  const merged = mergeRoutedSpecialists(mergeRoutedSpecialists(nfrSpecialists, configSpecialists), keywordRoutes);
  return { specialists: merged, keywordRoutes };
}

export function isAllowedStrategyEvidenceType(value) {
  return NFR_EVIDENCE_TYPES.includes(
    String(value || '')
      .trim()
      .toLowerCase()
  );
}
