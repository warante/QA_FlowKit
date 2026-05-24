import path from 'node:path';
import { getConfigValue } from './utils.mjs';

export function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'custom';
}

export function isConfiguredFramework(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'manual', 'n/a', 'na'].includes(normalized);
}

export function addCommonDirs(dirs, config) {
  const featureRoot = getConfigValue(config, 'gherkin.featurePath', 'features');
  const featureTypes = ['functional', 'integration', 'e2e', 'api', 'accessibility', 'manual'];

  dirs.add('qa-ai-output');
  dirs.add(featureRoot);
  for (const type of featureTypes) dirs.add(path.join(featureRoot, type));

  const matrixPath = getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  if (matrixPath) dirs.add(path.dirname(matrixPath));

  const mappingFile = getConfigValue(config, 'testrail.mappingFile', 'qa-ai-output/test-management-mapping.json');
  if (mappingFile) dirs.add(path.dirname(mappingFile));

  const knowledgeSummaryPath = getConfigValue(config, 'knowledge.summaryPath', 'qa-ai-output/qa-knowledge-summary.md');
  const knowledgeDecisionsPath = getConfigValue(config, 'knowledge.decisionsPath', 'qa-ai-output/qa-init-decisions.md');
  if (knowledgeSummaryPath) dirs.add(path.dirname(knowledgeSummaryPath));
  if (knowledgeDecisionsPath) dirs.add(path.dirname(knowledgeDecisionsPath));
}

export function addUiDirs(dirs, config) {
  const framework = String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase();
  const specsPath = getConfigValue(config, 'automation.ui.specsPath', '');
  const pageObjectsPath = getConfigValue(config, 'automation.ui.pageObjectsPath', '');

  if (isConfiguredFramework(framework)) {
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

  const base = specsPath ? path.dirname(specsPath) : path.join('tests', slug(framework));
  dirs.add(specsPath || path.join(base, 'specs'));
  dirs.add(path.join(base, 'clients'));
  dirs.add(path.join(base, 'fixtures'));
  dirs.add(path.join(base, 'schemas'));
  dirs.add(path.join(base, 'helpers'));
}

export function configuredDirs(config) {
  const dirs = new Set();
  addCommonDirs(dirs, config);
  addUiDirs(dirs, config);
  addApiDirs(dirs, config);
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
    categories: ['api'],
    aliases: ['karate']
  },
  appium: {
    title: 'Appium Specialist',
    categories: ['mobile'],
    aliases: ['appium']
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
  }
};

export function activeSpecialists(config) {
  const mode = String(getConfigValue(config, 'agents.specialistMode', 'auto')).toLowerCase();
  if (mode === 'off' || mode === 'none') return [];

  const wanted = [
    ['ui', getConfigValue(config, 'automation.ui.framework', '')],
    ['api', getConfigValue(config, 'automation.api.framework', '')],
    ['test-management', getConfigValue(config, 'tools.testManagement', '')],
    ['issue-tracker', getConfigValue(config, 'tools.issueTracker', '')]
  ];

  const active = new Map();
  for (const [category, value] of wanted) {
    const normalized = slug(value);
    if (!isConfiguredFramework(normalized)) continue;
    const entry = Object.entries(specialistCatalog).find(([, details]) => (
      details.categories.includes(category) && details.aliases.map(slug).includes(normalized)
    ));
    if (entry) active.set(entry[0], entry[1]);
  }

  if (mode === 'required' && active.size < wanted.filter(([, value]) => isConfiguredFramework(slug(value))).length) {
    console.warn('Warning: specialistMode is required, but some configured tools do not have specialists yet.');
  }

  active.set('generic-test-design', specialistCatalog['generic-test-design']);
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
      lines.push(`- \`${id}\`: ${details.title} (` + details.categories.join(', ') + `)`);
      lines.push(`  - Source: \`.qa-ai/agents/specialists/available/${id}.md\``);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}
