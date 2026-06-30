/** Single source of truth for Gherkin tag defaults, type values and acceptance labels. */

export const DEFAULT_REQUIRED_TAGS = ['priority', 'type', 'manual'];

/** Supported `@type:` values for Gherkin features (see gherkin.rules.md). */
export const GHERKIN_TYPE_VALUES = new Set([
  'functional',
  'regression',
  'smoke',
  'e2e',
  'integration',
  'api',
  'negative',
  'edge-case',
  'accessibility',
  'performance',
  'security'
]);

/** Map @type tag values to feature subfolders under gherkin.featurePath. */
export const TYPE_TO_FOLDER = {
  functional: 'functional',
  regression: 'functional',
  smoke: 'functional',
  negative: 'functional',
  'edge-case': 'functional',
  edge_case: 'functional',
  performance: 'functional',
  load: 'functional',
  stress: 'functional',
  integration: 'integration',
  e2e: 'e2e',
  api: 'api',
  accessibility: 'accessibility',
  a11y: 'accessibility',
  security: 'security'
};

export const FEATURE_SUBFOLDERS = ['functional', 'integration', 'e2e', 'api', 'accessibility', 'security', 'manual'];

export const ACCEPTANCE_LABELS = {
  en: 'Acceptance Criteria',
  es: 'Criterios de aceptación'
};

export function acceptanceLabelForLanguage(language) {
  return language === 'es' ? ACCEPTANCE_LABELS.es : ACCEPTANCE_LABELS.en;
}
