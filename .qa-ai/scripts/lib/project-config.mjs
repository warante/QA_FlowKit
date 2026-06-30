import path from 'node:path';
import {
  defaultKarateApiSpecsPath,
  defaultKarateConfigPath,
  defaultKarateMocksPath,
  defaultKaratePerformancePath,
  defaultKarateUiSpecsPath,
  isKarateFramework
} from './automation-framework.mjs';
import { getTestManagementMappingFile } from './test-management-config.mjs';
import { ARTIFACT_PATHS, QA_OUTPUT_DIR } from './artifact-paths.mjs';
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
  const featureRoot = getConfigValue(config, 'gherkin.featurePath', 'features');

  dirs.add(QA_OUTPUT_DIR);
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
    const base = specsPath ? path.dirname(specsPath) : path.join('tests', slug(framework));
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

  const base = specsPath ? path.dirname(specsPath) : path.join('tests', slug(framework));
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
  const base = flowsPath ? path.dirname(flowsPath) : path.join('tests', slug(framework));
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
  maintainability: 'maintainability'
};

export function specialistsForNfrAttributes(attributes = []) {
  const active = new Map();
  for (const attribute of attributes) {
    const normalized = String(attribute || '')
      .trim()
      .toLowerCase();
    const specialistId = NFR_ATTRIBUTE_SPECIALIST_MAP[normalized];
    if (!specialistId || !specialistCatalog[specialistId]) continue;
    active.set(specialistId, specialistCatalog[specialistId]);
  }
  return [...active.entries()].sort(([a], [b]) => a.localeCompare(b));
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
  return [...active.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function activeSpecialistsContent(config, sourceCommand = 'node .qa-ai/scripts/init.mjs') {
  const specialists = activeSpecialists(config);
  const lines = [
    '# Active QA AI Specialists',
    '',
    `Generated by \`${sourceCommand}\` from \`qa-ai.config.yaml\`.`,
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
