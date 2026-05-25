#!/usr/bin/env node
import path from 'node:path';
import { getConfigValue, loadQaAiConfig, parseArgs, pathExists, resolveRepoPath, logHeader } from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const strict = Boolean(args.strict);

const requiredScripts = [
  '.qa-ai/scripts/init.mjs',
  '.qa-ai/scripts/config.mjs',
  '.qa-ai/scripts/doctor.mjs',
  '.qa-ai/scripts/bootstrap-agent-adapters.mjs',
  '.qa-ai/scripts/clean.mjs',
  '.qa-ai/scripts/validate-features.mjs',
  '.qa-ai/scripts/validate-traceability.mjs',
  '.qa-ai/scripts/validate-sync-plan.mjs',
  '.qa-ai/scripts/validate-active-specialists.mjs',
  '.qa-ai/scripts/validate-target.mjs',
  '.qa-ai/scripts/test-validators.mjs',
  '.qa-ai/scripts/smoke-test.mjs',
  '.qa-ai/scripts/sync-agent-adapters.mjs',
  '.qa-ai/scripts/lib/markdown-table.mjs',
  '.qa-ai/scripts/lib/project-config.mjs',
  '.qa-ai/scripts/lib/test-management-mapping.mjs',
  '.qa-ai/scripts/lib/utils.mjs'
];

const requiredRules = [
  '.qa-ai/rules/approval.rules.md',
  '.qa-ai/rules/api-testing.rules.md',
  '.qa-ai/rules/automation.rules.md',
  '.qa-ai/rules/gherkin.rules.md',
  '.qa-ai/rules/testrail.rules.md',
  '.qa-ai/rules/webdriverio.rules.md'
];

const requiredTemplates = [
  '.qa-ai/templates/automation-feasibility-report.template.md',
  '.qa-ai/templates/automation-implementation-plan.template.md',
  '.qa-ai/templates/feature.template',
  '.qa-ai/templates/jira-automation-task.template.md',
  '.qa-ai/templates/pr-template.md',
  '.qa-ai/templates/requirement-analysis.template.md',
  '.qa-ai/templates/test-design-proposal.template.md',
  '.qa-ai/templates/testrail-coverage-analysis.template.md',
  '.qa-ai/templates/test-management-mapping.template.json',
  '.qa-ai/templates/testrail-sync-plan.template.md',
  '.qa-ai/templates/traceability-matrix.template.md'
];

const requiredAgents = [
  '.qa-ai/agents/README.md',
  '.qa-ai/agents/api-testing-agent.md',
  '.qa-ai/agents/automation-feasibility-agent.md',
  '.qa-ai/agents/gherkin-test-design-agent.md',
  '.qa-ai/agents/qa-context-intake-agent.md',
  '.qa-ai/agents/jira-task-agent.md',
  '.qa-ai/agents/pr-agent.md',
  '.qa-ai/agents/qa-workflow-orchestrator.md',
  '.qa-ai/agents/requirements-intake-agent.md',
  '.qa-ai/agents/requirements-normalization-agent.md',
  '.qa-ai/agents/testrail-coverage-agent.md',
  '.qa-ai/agents/testrail-sync-agent.md',
  '.qa-ai/agents/webdriverio-implementation-agent.md'
];

const requiredSpecialists = [
  '.qa-ai/agents/specialists/available/appium.md',
  '.qa-ai/agents/specialists/available/cypress.md',
  '.qa-ai/agents/specialists/available/generic-test-design.md',
  '.qa-ai/agents/specialists/available/jira.md',
  '.qa-ai/agents/specialists/available/karate.md',
  '.qa-ai/agents/specialists/available/playwright-api.md',
  '.qa-ai/agents/specialists/available/playwright-ui.md',
  '.qa-ai/agents/specialists/available/postman.md',
  '.qa-ai/agents/specialists/available/rest-assured.md',
  '.qa-ai/agents/specialists/available/selenium.md',
  '.qa-ai/agents/specialists/available/testrail.md',
  '.qa-ai/agents/specialists/available/webdriverio.md'
];

const requiredPresets = [
  '.qa-ai/presets/manual-only.yaml',
  '.qa-ai/presets/selenium-jest-browserstack.yaml',
  '.qa-ai/presets/webdriverio-playwright-api.yaml'
];

const requiredWorkflows = [
  '.qa-ai/workflows/automation-analysis.md',
  '.qa-ai/workflows/cleanup.md',
  '.qa-ai/workflows/context-intake.md',
  '.qa-ai/workflows/full-flow.md',
  '.qa-ai/workflows/implementation.md',
  '.qa-ai/workflows/intake.md',
  '.qa-ai/workflows/pr.md',
  '.qa-ai/workflows/test-design.md',
  '.qa-ai/workflows/testrail-sync.md'
];

const requiredAdapterTemplates = [
  '.qa-ai/adapters/aider/.aider.conf.yml',
  '.qa-ai/adapters/aider/.aider/README.md',
  '.qa-ai/adapters/claude/agents/qa-workflow-orchestrator.md',
  '.qa-ai/adapters/claude/commands/qa-add-tests.md',
  '.qa-ai/adapters/claude/commands/qa-automation-plan.md',
  '.qa-ai/adapters/claude/commands/qa-clean.md',
  '.qa-ai/adapters/claude/commands/qa-config.md',
  '.qa-ai/adapters/claude/commands/qa-coverage.md',
  '.qa-ai/adapters/claude/commands/qa-doctor.md',
  '.qa-ai/adapters/claude/commands/qa-full-flow.md',
  '.qa-ai/adapters/claude/commands/qa-init.md',
  '.qa-ai/adapters/claude/commands/qa-status.md',
  '.qa-ai/adapters/claude/commands/qa-update-tests.md',
  '.qa-ai/adapters/claude/commands/qa-validate-features.md',
  '.qa-ai/adapters/cline/.clinerules',
  '.qa-ai/adapters/cline/.cline/README.md',
  '.qa-ai/adapters/codex/README.md',
  '.qa-ai/adapters/codex/prompts/implement-project.md',
  '.qa-ai/adapters/continue/README.md',
  '.qa-ai/adapters/continue/checks/qa-feature-conventions.md',
  '.qa-ai/adapters/generic/AGENTS.md',
  '.qa-ai/adapters/gemini/GEMINI.md',
  '.qa-ai/adapters/goose/recipes/qa-ai-workflow.yaml',
  '.qa-ai/adapters/opencode/README.md',
  '.qa-ai/adapters/opencode/agents/qa-workflow.md',
  '.qa-ai/adapters/opencode/commands/qa-add-tests.md',
  '.qa-ai/adapters/opencode/commands/qa-automation-plan.md',
  '.qa-ai/adapters/opencode/commands/qa-clean.md',
  '.qa-ai/adapters/opencode/commands/qa-config.md',
  '.qa-ai/adapters/opencode/commands/qa-coverage.md',
  '.qa-ai/adapters/opencode/commands/qa-doctor.md',
  '.qa-ai/adapters/opencode/commands/qa-full-flow.md',
  '.qa-ai/adapters/opencode/commands/qa-init.md',
  '.qa-ai/adapters/opencode/commands/qa-status.md',
  '.qa-ai/adapters/opencode/commands/qa-update-tests.md',
  '.qa-ai/adapters/opencode/commands/qa-validate-features.md'
];

const generatedAdapters = [
  ['Claude adapter', '.claude'],
  ['Codex adapter', '.codex'],
  ['OpenCode adapter', '.opencode'],
  ['Cline rules', '.clinerules'],
  ['Cline docs', '.cline'],
  ['Continue adapter', '.continue'],
  ['Aider config', '.aider.conf.yml'],
  ['Aider docs', '.aider'],
  ['Goose recipe', '.goose/recipes/qa-ai-workflow.yaml'],
  ['Gemini context', 'GEMINI.md']
];

function pathCheck(level, label, relPath) {
  return { level, label, paths: [relPath] };
}

function anyPathCheck(level, label, relPaths) {
  return { level, label, paths: relPaths, any: true };
}

function isConfiguredFramework(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'manual', 'n/a', 'na'].includes(normalized);
}

function isEnabled(value) {
  return value === true || String(value || '').trim().toLowerCase() === 'true';
}

function checkLevel(defaultLevel) {
  return strict && defaultLevel === 'optional' ? 'required' : defaultLevel;
}

function isConfiguredTool(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'n/a', 'na'].includes(normalized);
}

function addWorkflowArtifactChecks(checks, config) {
  const testManagementTool = getConfigValue(config, 'tools.testManagement', '');
  const issueTracker = getConfigValue(config, 'tools.issueTracker', '');
  const uiFramework = getConfigValue(config, 'automation.ui.framework', 'none');
  const apiFramework = getConfigValue(config, 'automation.api.framework', 'none');
  const hasAutomation = isConfiguredFramework(uiFramework) || isConfiguredFramework(apiFramework);

  checks.push(pathCheck(checkLevel('optional'), 'requirement analysis artifact', 'qa-ai-output/requirement-analysis.md'));
  checks.push(pathCheck(checkLevel('optional'), 'test design proposal artifact', 'qa-ai-output/test-design-proposal.md'));
  checks.push(pathCheck(checkLevel('optional'), 'PR summary artifact', 'qa-ai-output/pr-summary.md'));

  if (isConfiguredTool(testManagementTool)) {
    checks.push(pathCheck(checkLevel('optional'), 'test management coverage artifact', 'qa-ai-output/testrail-coverage-analysis.md'));
    checks.push(pathCheck(checkLevel('optional'), 'test management sync plan artifact', 'qa-ai-output/testrail-sync-plan.md'));
  }

  if (hasAutomation) {
    checks.push(pathCheck(checkLevel('optional'), 'automation feasibility artifact', 'qa-ai-output/automation-feasibility-report.md'));
    checks.push(pathCheck(checkLevel('optional'), 'automation implementation plan artifact', 'qa-ai-output/automation-implementation-plan.md'));
  }

  if (isConfiguredTool(issueTracker)) {
    checks.push(pathCheck(checkLevel('optional'), 'issue tracker task draft artifact', 'qa-ai-output/jira-automation-task.md'));
  }
}

function addConfiguredChecks(checks, config) {
  const featurePath = getConfigValue(config, 'gherkin.featurePath', 'features');
  const matrixPath = getConfigValue(config, 'traceability.matrixPath', 'qa-ai-output/traceability-matrix.md');
  const mappingFile = getConfigValue(config, 'testrail.mappingFile', '');
  const uiFramework = String(getConfigValue(config, 'automation.ui.framework', 'none')).toLowerCase();
  const uiSpecsPath = getConfigValue(config, 'automation.ui.specsPath', '');
  const uiPageObjectsPath = getConfigValue(config, 'automation.ui.pageObjectsPath', '');
  const apiFramework = String(getConfigValue(config, 'automation.api.framework', 'none')).toLowerCase();
  const apiSpecsPath = getConfigValue(config, 'automation.api.specsPath', '');
  const knowledgeEnabled = isEnabled(getConfigValue(config, 'knowledge.enabled', false));
  const knowledgeSourcePath = getConfigValue(config, 'knowledge.sourcePath', '');
  const knowledgeSummaryPath = getConfigValue(config, 'knowledge.summaryPath', 'qa-ai-output/qa-knowledge-summary.md');
  const knowledgeDecisionsPath = getConfigValue(config, 'knowledge.decisionsPath', 'qa-ai-output/qa-init-decisions.md');

  checks.push(pathCheck('required', 'configured feature root', featurePath));
  checks.push(pathCheck('required', 'configured QA output path', path.dirname(matrixPath)));
  checks.push(pathCheck(checkLevel('optional'), 'configured traceability matrix', matrixPath));
  if (mappingFile) checks.push(pathCheck(checkLevel('optional'), 'configured test management mapping file', mappingFile));
  addWorkflowArtifactChecks(checks, config);

  if (knowledgeEnabled) {
    checks.push(pathCheck('required', 'configured QA context folder', knowledgeSourcePath));
    if (knowledgeSummaryPath) checks.push(pathCheck(checkLevel('optional'), 'QA context summary artifact', knowledgeSummaryPath));
    if (knowledgeDecisionsPath) checks.push(pathCheck(checkLevel('optional'), 'QA init decisions artifact', knowledgeDecisionsPath));
  }

  if (isConfiguredFramework(uiFramework)) {
    if (uiSpecsPath) checks.push(pathCheck('required', 'configured UI specs path', uiSpecsPath));
    if (uiPageObjectsPath) checks.push(pathCheck('required', 'configured UI page objects path', uiPageObjectsPath));
  }

  if (isConfiguredFramework(apiFramework)) {
    if (apiSpecsPath) checks.push(pathCheck('required', 'configured API specs path', apiSpecsPath));
  }

  if (uiFramework === 'webdriverio') {
    checks.push(anyPathCheck(checkLevel('optional'), 'WebdriverIO config', [
      'wdio.conf.ts',
      'wdio.conf.js',
      'wdio.conf.mjs',
      'wdio.conf.cjs'
    ]));
  }

  if (uiFramework === 'selenium-jest-browserstack' || uiFramework === 'selenium') {
    checks.push(anyPathCheck(checkLevel('optional'), 'Jest config', [
      'jest.config.ts',
      'jest.config.js',
      'jest.config.mjs',
      'jest.config.cjs'
    ]));
    checks.push(anyPathCheck(checkLevel('optional'), 'BrowserStack config', [
      'browserstack.yml',
      'browserstack.yaml'
    ]));
  }

  if (apiFramework === 'playwright-api' || apiFramework === 'playwright') {
    checks.push(anyPathCheck(checkLevel('optional'), 'Playwright API config', [
      'playwright.api.config.ts',
      'playwright.api.config.js',
      'playwright.config.ts',
      'playwright.config.js',
      'playwright.config.mjs'
    ]));
  }
}

async function runCheck(check) {
  const resolvedPaths = [];
  for (const relPath of check.paths) {
    try {
      resolvedPaths.push(resolveRepoPath(cwd, relPath, {
        label: check.label,
        allowRoot: relPath === '.'
      }));
    } catch (error) {
      return { ...check, ok: false, reason: error.message };
    }
  }
  const results = await Promise.all(resolvedPaths.map((filePath) => pathExists(filePath)));
  const ok = check.any ? results.some(Boolean) : results.every(Boolean);
  return { ...check, ok };
}

function describePaths(paths, any = false) {
  if (paths.length === 1) return paths[0];
  return paths.join(any ? ' or ' : ', ');
}

async function main() {
  logHeader(`QA AI Starter doctor${strict ? ' --strict' : ''}`);
  const configInfo = await loadQaAiConfig(cwd);
  const isFrameworkSourceRepo = await pathExists(path.join(cwd, 'docs/qa-ai/architecture.md'));
  const configLevel = isFrameworkSourceRepo && !strict ? 'optional' : 'required';
  const genericInstructionsLevel = isFrameworkSourceRepo ? 'required' : 'optional';
  const checks = [
    pathCheck(configLevel, 'config', 'qa-ai.config.yaml'),
    pathCheck('required', 'framework folder', '.qa-ai'),
    pathCheck('required', 'agents folder', '.qa-ai/agents'),
    pathCheck('required', 'rules folder', '.qa-ai/rules'),
    pathCheck('required', 'templates folder', '.qa-ai/templates'),
    pathCheck('required', 'scripts folder', '.qa-ai/scripts'),
    pathCheck('required', 'presets folder', '.qa-ai/presets'),
    pathCheck('required', 'adapters folder', '.qa-ai/adapters'),
    pathCheck(genericInstructionsLevel, 'generic agent instructions', 'AGENTS.md'),
    ...requiredScripts.map((relPath) => pathCheck('required', `script ${path.basename(relPath)}`, relPath)),
    ...requiredRules.map((relPath) => pathCheck('required', `rule ${path.basename(relPath)}`, relPath)),
    ...requiredTemplates.map((relPath) => pathCheck('required', `template ${path.basename(relPath)}`, relPath)),
    ...requiredAgents.map((relPath) => pathCheck('required', `agent ${path.basename(relPath)}`, relPath)),
    ...requiredSpecialists.map((relPath) => pathCheck('required', `specialist ${path.basename(relPath)}`, relPath)),
    ...requiredPresets.map((relPath) => pathCheck('required', `preset ${path.basename(relPath)}`, relPath)),
    ...requiredWorkflows.map((relPath) => pathCheck('required', `workflow ${path.basename(relPath)}`, relPath)),
    ...requiredAdapterTemplates.map((relPath) => pathCheck('required', `adapter template ${relPath.split('/').slice(2).join('/')}`, relPath)),
    ...generatedAdapters.map(([label, relPath]) => pathCheck('optional', label, relPath))
  ];

  if (configInfo.exists) addConfiguredChecks(checks, configInfo.data);
  if (configInfo.exists) checks.push(pathCheck('optional', 'init manifest', '.qa-ai/state/init-manifest.json'));
  if (configInfo.exists) checks.push(pathCheck('required', 'active specialists index', '.qa-ai/agents/specialists/active.md'));

  let failed = 0;
  let warned = 0;
  for (const check of checks) {
    const result = await runCheck(check);
    const target = describePaths(result.paths, result.any);
    if (result.ok) {
      console.log(`[PASS] ${check.label}: ${target}`);
    } else if (check.level === 'required') {
      failed += 1;
      console.log(`[FAIL] ${check.label}: ${target}${result.reason ? ` (${result.reason})` : ''}`);
    } else {
      warned += 1;
      console.log(`[WARN] ${check.label}: ${target}${result.reason ? ` (${result.reason})` : ''}`);
    }
  }

  console.log('\nResult:');
  if (failed > 0) {
    console.log(`FAILED - ${failed} required checks failed, ${warned} warnings.`);
    process.exit(1);
  }
  if (warned > 0) {
    console.log(`VALID WITH WARNINGS - ${warned} optional checks missing.`);
    return;
  }
  console.log('VALID - all checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
