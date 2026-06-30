import path from 'node:path';
import {
  defaultKarateApiSpecsPath,
  defaultKarateConfigPath,
  defaultKarateMocksPath,
  defaultKaratePerformancePath,
  defaultKarateUiSpecsPath,
  isKarateFramework
} from './automation-framework.mjs';
import { COMPACT_TESTS_DIR } from './project-paths.mjs';
import { getTestManagementMappingFile } from './test-management-config.mjs';
import { ARTIFACT_PATHS, DEFAULT_FEATURE_PATH } from './artifact-paths.mjs';
import { getConfigValue } from './utils.mjs';

export function slug(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'custom'
  );
}

export function isConfiguredFramework(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'manual', 'n/a', 'na'].includes(normalized);
}

export function addCommonDirs(dirs, config) {
  const featureRoot = getConfigValue(config, 'gherkin.featurePath', DEFAULT_FEATURE_PATH);

  // Type subfolders (functional, api, e2e, …) are created when the first .feature is written.
  dirs.add(featureRoot);

  const matrixPath = getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  if (matrixPath) dirs.add(path.dirname(matrixPath));

  const mappingFile = getTestManagementMappingFile(config);
  if (mappingFile) dirs.add(path.dirname(mappingFile));

  const knowledgeSummaryPath = getConfigValue(config, 'knowledge.summaryPath', ARTIFACT_PATHS.qaKnowledgeSummary);
  const knowledgeDecisionsPath = getConfigValue(config, 'knowledge.decisionsPath', ARTIFACT_PATHS.qaInitDecisions);
  const sourceAnalysisPath = getConfigValue(config, 'sources.analysisPath', ARTIFACT_PATHS.sourceAnalysis);
  if (knowledgeSummaryPath) dirs.add(path.dirname(knowledgeSummaryPath));
  if (knowledgeDecisionsPath) dirs.add(path.dirname(knowledgeDecisionsPath));
  if (sourceAnalysisPath) dirs.add(path.dirname(sourceAnalysisPath));
}

export function addUiDirs(dirs, config) {
  const framework = String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase();
  const specsPath = getConfigValue(config, 'automation.ui.specsPath', '');
  const pageObjectsPath = getConfigValue(config, 'automation.ui.pageObjectsPath', '');

  if (isConfiguredFramework(framework)) {
    if (isKarateFramework(framework)) {
      dirs.add(specsPath || defaultKarateUiSpecsPath());
      addKarateSharedDirs(dirs, config);
      return;
    }
    const base = specsPath ? path.dirname(specsPath) : path.join(COMPACT_TESTS_DIR, slug(framework));
    dirs.add(specsPath || path.join(base, 'specs'));
    if (pageObjectsPath || framework !== 'api') dirs.add(pageObjectsPath || path.join(base, 'pageobjects'));
    dirs.add(path.join(base, 'helpers'));
    dirs.add(path.join(base, 'fixtures'));
  }
}

export function addApiDirs(dirs, config) {
  const framework = String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase();
  const specsPath = getConfigValue(config, 'automation.api.specsPath', '');
  if (!isConfiguredFramework(framework)) return;

  if (isKarateFramework(framework)) {
    dirs.add(specsPath || defaultKarateApiSpecsPath());
    addKarateSharedDirs(dirs, config);
    return;
  }

  const base = specsPath ? path.dirname(specsPath) : path.join(COMPACT_TESTS_DIR, slug(framework));
  dirs.add(specsPath || path.join(base, 'specs'));
  dirs.add(path.join(base, 'clients'));
  dirs.add(path.join(base, 'fixtures'));
  dirs.add(path.join(base, 'schemas'));
  dirs.add(path.join(base, 'helpers'));
}

export function addMobileDirs(dirs, config) {
  const framework = String(getConfigValue(config, 'automation.mobile.framework', 'none')).toLowerCase();
  if (!isConfiguredFramework(framework)) return;

  const flowsPath = getConfigValue(config, 'automation.mobile.flowsPath', '');
  const base = flowsPath ? path.dirname(flowsPath) : path.join(COMPACT_TESTS_DIR, slug(framework));
  dirs.add(flowsPath || path.join(base, 'flows'));
  dirs.add(path.join(base, 'subflows'));
  dirs.add(path.join(base, 'fixtures'));
}

export function addKarateSharedDirs(dirs, config) {
  const configPath = getConfigValue(config, 'automation.karate.configPath', defaultKarateConfigPath());
  const mocksPath = getConfigValue(config, 'automation.karate.mocksPath', defaultKarateMocksPath());
  const performancePath = getConfigValue(config, 'automation.karate.performancePath', defaultKaratePerformancePath());
  dirs.add(path.dirname(configPath));
  if (mocksPath) dirs.add(mocksPath);
  if (performancePath) dirs.add(performancePath);
}

export function addKarateDirs(dirs, config) {
  if (
    !isKarateFramework(getConfigValue(config, 'automation.api.framework', '')) &&
    !isKarateFramework(getConfigValue(config, 'automation.ui.framework', ''))
  ) {
    return;
  }
  addKarateSharedDirs(dirs, config);
}

export function configuredDirs(config) {
  const dirs = new Set();
  addCommonDirs(dirs, config);
  addUiDirs(dirs, config);
  addApiDirs(dirs, config);
  addMobileDirs(dirs, config);
  addKarateDirs(dirs, config);
  return dirs;
}

export const specialistCatalog = {
  'playwright-ui': {
    title: 'Playwright UI Specialist',
    categories: ['ui'],
    aliases: ['playwright', 'playwright-ui']
  },
  cypress: {
    title: 'Cypress Specialist',
    categories: ['ui'],
    aliases: ['cypress']
  },
  webdriverio: {
    title: 'WebdriverIO Specialist',
    categories: ['ui'],
    aliases: ['webdriverio', 'wdio']
  },
  selenium: {
    title: 'Selenium Specialist',
    categories: ['ui'],
    aliases: ['selenium', 'selenium-jest-browserstack']
  },
  'playwright-api': {
    title: 'Playwright API Specialist',
    categories: ['api'],
    aliases: ['playwright-api', 'playwright']
  },
  postman: {
    title: 'Postman/Newman Specialist',
    categories: ['api'],
    aliases: ['postman', 'newman']
  },
  'rest-assured': {
    title: 'REST Assured Specialist',
    categories: ['api'],
    aliases: ['rest-assured', 'restassured']
  },
  karate: {
    title: 'Karate API Specialist',
    categories: ['api', 'ui'],
    aliases: ['karate']
  },
  appium: {
    title: 'Appium Specialist',
    categories: ['mobile'],
    aliases: ['appium']
  },
  maestro: {
    title: 'Maestro Mobile Specialist',
    categories: ['mobile'],
    aliases: ['maestro']
  },
  'generic-test-design': {
    title: 'Generic Test Design Specialist',
    categories: ['test-design'],
    aliases: ['generic-test-design', 'test-design', 'non-gherkin']
  },
  testrail: {
    title: 'TestRail Specialist',
    categories: ['test-management'],
    aliases: ['testrail']
  },
  jira: {
    title: 'Jira Specialist',
    categories: ['issue-tracker'],
    aliases: ['jira']
  },
  accessibility: {
    title: 'Accessibility Testing Specialist',
    categories: ['accessibility'],
    aliases: ['accessibility', 'a11y', 'wcag']
  },
  performance: {
    title: 'Performance Testing Specialist',
    categories: ['performance'],
    aliases: ['performance', 'load', 'stress', 'nfr']
  },
  security: {
    title: 'Functional Security Testing Specialist',
    categories: ['security'],
    aliases: ['security', 'functional-security', 'owasp-functional']
  },
  'availability-reliability': {
    title: 'Availability and Reliability Specialist',
    categories: ['availability', 'reliability'],
    aliases: ['availability-reliability', 'availability', 'reliability', 'resilience']
  },
  scalability: {
    title: 'Scalability Specialist',
    categories: ['scalability'],
    aliases: ['scalability', 'load-growth']
  },
  usability: {
    title: 'Usability Specialist',
    categories: ['usability'],
    aliases: ['usability', 'ux']
  },
  'compatibility-portability': {
    title: 'Compatibility and Portability Specialist',
    categories: ['compatibility', 'portability'],
    aliases: ['compatibility-portability', 'compatibility', 'portability']
  },
  maintainability: {
    title: 'Maintainability Specialist',
    categories: ['maintainability'],
    aliases: ['maintainability', 'operability']
  },
  'ai-evals': {
    title: 'AI Eval Suite Specialist',
    categories: ['ai-testing'],
    aliases: ['ai-evals', 'evals', 'promptfoo', 'deepeval']
  },
  'ai-red-team': {
    title: 'AI Red Team Specialist',
    categories: ['ai-testing', 'security'],
    aliases: ['ai-red-team', 'llm-red-team', 'adversarial-ai']
  },
  // On-demand strategy specialists (keyword / NFR / config routing)
  'analytics-tracking-agent': {
    title: 'Analytics and Tracking Testing Specialist',
    categories: ['analytics', 'tracking', 'telemetry'],
    aliases: ['analytics', 'tracking', 'events', 'posthog', 'plausible', 'segment', 'amplitude']
  },
  'browserstack-strategy-agent': {
    title: 'BrowserStack Strategy Specialist',
    categories: ['browserstack', 'device-cloud', 'ui', 'mobile'],
    aliases: ['browserstack', 'automate', 'app-automate', 'browserstack-live', 'device-cloud']
  },
  'compliance-testing-agent': {
    title: 'Compliance Testing Specialist',
    categories: ['compliance', 'release'],
    aliases: ['compliance', 'regulatory', 'audit', 'pci', 'soc2', 'iso27001', 'eidas']
  },
  'contract-testing-agent': {
    title: 'Contract Testing Specialist',
    categories: ['contract', 'api', 'integration'],
    aliases: ['contract', 'contract-testing', 'openapi', 'asyncapi', 'pact', 'schema']
  },
  'cross-browser-device-agent': {
    title: 'Cross-Browser and Cross-Device Testing Specialist',
    categories: ['compatibility', 'portability', 'ui', 'mobile'],
    aliases: ['cross-browser', 'cross-device', 'browser-matrix', 'device-matrix', 'responsive']
  },
  'data-quality-agent': {
    title: 'Data Quality Testing Specialist',
    categories: ['data-quality', 'integration'],
    aliases: ['data-quality', 'reconciliation', 'etl', 'reporting-data']
  },
  'database-migration-agent': {
    title: 'Database Migration Testing Specialist',
    categories: ['database-migration', 'data-quality'],
    aliases: ['database-migration', 'migration', 'schema-change', 'backfill', 'rollback']
  },
  'exploratory-testing-agent': {
    title: 'Exploratory Testing Specialist',
    categories: ['exploratory', 'test-design'],
    aliases: ['exploratory', 'exploratory-testing', 'session-based-testing', 'charter']
  },
  'i18n-l10n-agent': {
    title: 'Internationalization and Localization Testing Specialist',
    categories: ['i18n', 'l10n', 'localization'],
    aliases: ['i18n', 'l10n', 'localization', 'internationalization', 'locale', 'timezone']
  },
  'observability-testing-agent': {
    title: 'Observability Testing Specialist',
    categories: ['observability', 'maintainability'],
    aliases: ['observability', 'logging', 'metrics', 'tracing', 'alerts', 'audit-events']
  },
  'performance-execution-agent': {
    title: 'Performance Execution Specialist',
    categories: ['performance', 'load-execution'],
    aliases: ['performance-execution', 'k6', 'jmeter', 'gatling', 'load-test', 'stress-test', 'soak-test']
  },
  'post-deploy-validation-agent': {
    title: 'Post-Deploy Validation Specialist',
    categories: ['post-deploy', 'release'],
    aliases: ['post-deploy', 'deployment-validation', 'production-smoke', 'synthetic', 'canary', 'rollback']
  },
  'privacy-testing-agent': {
    title: 'Privacy Testing Specialist',
    categories: ['privacy', 'compliance', 'security'],
    aliases: ['privacy', 'gdpr', 'pii', 'consent', 'cookies', 'retention', 'deletion', 'biometrics']
  },
  'resilience-chaos-agent': {
    title: 'Resilience and Chaos Testing Specialist',
    categories: ['resilience', 'reliability'],
    aliases: ['resilience', 'chaos', 'failover', 'disaster-recovery', 'circuit-breaker']
  },
  'security-advanced-agent': {
    title: 'Advanced Security Testing Specialist',
    categories: ['security', 'advanced-security'],
    aliases: ['advanced-security', 'sast', 'dast', 'dependency-scan', 'secret-scan', 'supply-chain']
  },
  'test-data-agent': {
    title: 'Test Data Strategy Specialist',
    categories: ['test-data', 'test-design'],
    aliases: ['test-data', 'fixtures', 'synthetic-data', 'data-setup']
  },
  'threat-modeling-agent': {
    title: 'Threat Modeling Specialist',
    categories: ['security', 'threat-modeling'],
    aliases: ['threat-model', 'threat-modeling', 'stride', 'abuse-case', 'misuse-case']
  },
  'visual-regression-agent': {
    title: 'Visual Regression Testing Specialist',
    categories: ['visual-regression', 'ui'],
    aliases: ['visual', 'visual-regression', 'screenshot', 'figma', 'layout']
  },
  'mobile-advanced-agent': {
    title: 'Mobile Advanced Testing Specialist',
    categories: ['mobile', 'mobile-advanced', 'test-design'],
    aliases: [
      'mobile-advanced',
      'mobile-interruptions',
      'mobile-permissions',
      'offline-mobile',
      'push-notifications',
      'deep-links',
      'biometrics',
      'mobile-upgrade'
    ]
  }
};

/** Maps source NFR quality attributes to on-demand specialist ids (execution-time only). */
export const NFR_ATTRIBUTE_SPECIALIST_MAP = {
  security: 'security',
  performance: 'performance',
  scalability: 'scalability',
  accessibility: 'accessibility',
  availability: 'availability-reliability',
  reliability: 'availability-reliability',
  usability: 'usability',
  portability: 'compatibility-portability',
  compatibility: 'compatibility-portability',
  maintainability: ['maintainability', 'observability-testing-agent']
};

function resolveSpecialistIds(mapValue) {
  if (!mapValue) return [];
  return Array.isArray(mapValue) ? mapValue : [mapValue];
}

export function specialistsForNfrAttributes(attributes = []) {
  const active = new Map();
  for (const attribute of attributes) {
    const normalized = String(attribute || '')
      .trim()
      .toLowerCase();
    for (const specialistId of resolveSpecialistIds(NFR_ATTRIBUTE_SPECIALIST_MAP[normalized])) {
      if (!specialistCatalog[specialistId]) continue;
      active.set(specialistId, specialistCatalog[specialistId]);
    }
  }
  return [...active.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function frameworkSlugIncludes(value, token) {
  return slug(value).includes(token);
}

function addConfigRoutedSpecialists(active, config) {
  const uiFramework = getConfigValue(config, 'automation.ui.framework', '');
  const mobileFramework = getConfigValue(config, 'automation.mobile.framework', '');
  const uiSlug = slug(uiFramework);
  const mobileSlug = slug(mobileFramework);

  if (frameworkSlugIncludes(uiFramework, 'browserstack') || frameworkSlugIncludes(mobileFramework, 'browserstack')) {
    active.set('browserstack-strategy-agent', specialistCatalog['browserstack-strategy-agent']);
  }

  const crossBrowserSignals = ['browserstack', 'device-matrix', 'browser-matrix', 'cross-browser', 'cross-device'];
  if (crossBrowserSignals.some((token) => uiSlug.includes(token) || mobileSlug.includes(token))) {
    active.set('cross-browser-device-agent', specialistCatalog['cross-browser-device-agent']);
  }
}

export function activeSpecialists(config) {
  const mode = String(getConfigValue(config, 'agents.specialistMode', 'auto')).toLowerCase();
  if (mode === 'off' || mode === 'none') return [];

  const wanted = [
    ['ui', getConfigValue(config, 'automation.ui.framework', '')],
    ['api', getConfigValue(config, 'automation.api.framework', '')],
    ['mobile', getConfigValue(config, 'automation.mobile.framework', '')],
    ['test-management', getConfigValue(config, 'tools.testManagement', '')],
    ['issue-tracker', getConfigValue(config, 'tools.issueTracker', '')]
  ];

  const active = new Map();
  for (const [category, value] of wanted) {
    const normalized = slug(value);
    if (!isConfiguredFramework(normalized)) continue;
    const entry = Object.entries(specialistCatalog).find(
      ([, details]) => details.categories.includes(category) && details.aliases.map(slug).includes(normalized)
    );
    if (entry) active.set(entry[0], entry[1]);
  }

  if (mode === 'required' && active.size < wanted.filter(([, value]) => isConfiguredFramework(slug(value))).length) {
    console.warn('Warning: specialistMode is required, but some configured tools do not have specialists yet.');
  }

  active.set('generic-test-design', specialistCatalog['generic-test-design']);
  if (getConfigValue(config, 'testDesign.coverage.requireSecurityReview', false)) {
    active.set('security', specialistCatalog.security);
  }
  if (getConfigValue(config, 'aiTesting.enabled', false)) {
    active.set('ai-evals', specialistCatalog['ai-evals']);
    active.set('ai-red-team', specialistCatalog['ai-red-team']);
  }
  addConfigRoutedSpecialists(active, config);
  return [...active.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function activeSpecialistsContent(
  config,
  sourceCommand = 'node .qa-ai/scripts/init.mjs',
  configRelPath = 'qa-ai.config.yaml'
) {
  const specialists = activeSpecialists(config);
  const lines = [
    '# Active QA AI Specialists',
    '',
    `Generated by \`${sourceCommand}\` from \`${configRelPath}\`.`,
    'The orchestrator should load only these specialist instructions in addition to the generic agents.',
    ''
  ];

  if (specialists.length === 0) {
    lines.push('No specialist agents are active. Use the generic agents.');
  } else {
    for (const [id, details] of specialists) {
      lines.push(`- \`${id}\`: ${details.title} (${details.categories.join(', ')})`);
      lines.push(`  - Source: \`.qa-ai/agents/specialists/available/${id}.md\``);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}
