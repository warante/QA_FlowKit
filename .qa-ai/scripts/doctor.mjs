#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { isKarateFramework, karateConfigPath, karateFeatureRoots, usesKarate } from './lib/automation-framework.mjs';
import { validateConfigContent } from './lib/config-schema.mjs';
import { FEATURE_SUBFOLDERS } from './lib/feature-layout.mjs';
import { loadWorkflowContract, validateWorkflowContract } from './lib/harness-contract.mjs';
import { inspectQaWorkflow, normalizeQaTrack } from './lib/qa-next-steps.mjs';
import { customValidatorsFromConfig, validateCustomValidatorConfig } from './lib/custom-validators.mjs';
import {
  findChangeMeKeys,
  getConfigValue,
  inferredAcceptanceCriteriaConflicts,
  LEGACY_ARTIFACT_ALIASES,
  loadQaAiConfig,
  parseArgs,
  parseSimpleYaml,
  pathExists,
  resolveRepoPath,
  logHeader
} from './lib/utils.mjs';
import { collectLegacyConfigSignals, LEGACY_CONFIG_MIGRATION_DOC } from './lib/config-legacy.mjs';

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
  '.qa-ai/scripts/validate-karate-features.mjs',
  '.qa-ai/scripts/validate-maestro-flows.mjs',
  '.qa-ai/scripts/validate-traceability.mjs',
  '.qa-ai/scripts/validate-sync-plan.mjs',
  '.qa-ai/scripts/validate-sync-diff.mjs',
  '.qa-ai/scripts/validate-sync-result.mjs',
  '.qa-ai/scripts/validate-active-specialists.mjs',
  '.qa-ai/scripts/validate-target.mjs',
  '.qa-ai/scripts/validate-config.mjs',
  '.qa-ai/scripts/validate-untrusted-content.mjs',
  '.qa-ai/scripts/qa-help.mjs',
  '.qa-ai/scripts/qa-run.mjs',
  '.qa-ai/scripts/validate-workflow-contract.mjs',
  '.qa-ai/scripts/validate-release-gate.mjs',
  '.qa-ai/scripts/validate-test-design.mjs',
  '.qa-ai/scripts/validate-test-coverage.mjs',
  '.qa-ai/scripts/validate-quality-report.mjs',
  '.qa-ai/scripts/validate-healing-log.mjs',
  '.qa-ai/scripts/validate-test-impact.mjs',
  '.qa-ai/scripts/test-validators.mjs',
  '.qa-ai/scripts/smoke-test.mjs',
  '.qa-ai/scripts/smoke-npm-pack.mjs',
  '.qa-ai/scripts/sync-agent-adapters.mjs',
  '.qa-ai/scripts/lib/qa-next-steps.mjs',
  '.qa-ai/scripts/lib/harness-contract.mjs',
  '.qa-ai/scripts/lib/harness-controller.mjs',
  '.qa-ai/scripts/lib/harness-context.mjs',
  '.qa-ai/scripts/lib/harness-messages.mjs',
  '.qa-ai/scripts/lib/harness-permissions.mjs',
  '.qa-ai/scripts/lib/harness-paths.mjs',
  '.qa-ai/scripts/lib/harness-modification.mjs',
  '.qa-ai/scripts/lib/harness-run-store.mjs',
  '.qa-ai/scripts/lib/harness-validation.mjs',
  '.qa-ai/scripts/lib/harness-validator-allowlist.mjs',
  '.qa-ai/scripts/lib/custom-validators.mjs',
  '.qa-ai/scripts/lib/release-gate.mjs',
  '.qa-ai/scripts/lib/test-design.mjs',
  '.qa-ai/scripts/lib/test-coverage.mjs',
  '.qa-ai/scripts/lib/quality-report.mjs',
  '.qa-ai/scripts/lib/markdown-table.mjs',
  '.qa-ai/scripts/lib/maestro-validate.mjs',
  '.qa-ai/scripts/lib/mobile-automation.mjs',
  '.qa-ai/scripts/lib/project-config.mjs',
  '.qa-ai/scripts/lib/config-schema.mjs',
  '.qa-ai/scripts/lib/detect-adapters.mjs',
  '.qa-ai/scripts/lib/injection-patterns.mjs',
  '.qa-ai/scripts/lib/test-management-mapping.mjs',
  '.qa-ai/scripts/lib/utils.mjs'
];

const requiredRulesIndex = '.qa-ai/rules/README.md';
const requiredRules = [
  '.qa-ai/rules/ai-testing.rules.md',
  '.qa-ai/rules/approval.rules.md',
  '.qa-ai/rules/api-testing.rules.md',
  '.qa-ai/rules/automation.rules.md',
  '.qa-ai/rules/cleanup.rules.md',
  '.qa-ai/rules/defect.rules.md',
  '.qa-ai/rules/gherkin-quality.rubric.md',
  '.qa-ai/rules/gherkin.rules.md',
  '.qa-ai/rules/karate.rules.md',
  '.qa-ai/rules/mobile-automation.rules.md',
  '.qa-ai/rules/issue-tracker.rules.md',
  '.qa-ai/rules/release-gate.rules.md',
  '.qa-ai/rules/requirements.rules.md',
  '.qa-ai/rules/test-design.rules.md',
  '.qa-ai/rules/test-management.rules.md',
  '.qa-ai/rules/testrail.rules.md',
  '.qa-ai/rules/untrusted-content.rules.md',
  '.qa-ai/rules/ui-automation.rules.md',
  '.qa-ai/rules/webdriverio.rules.md',
  '.qa-ai/rules/workflow.rules.md'
];

const requiredTemplates = [
  '.qa-ai/templates/automation-feasibility-report.template.md',
  '.qa-ai/templates/automation-implementation-plan.template.md',
  '.qa-ai/templates/feature.template',
  '.qa-ai/templates/gherkin-quality-report.template.md',
  '.qa-ai/templates/jira-automation-task.template.md',
  '.qa-ai/templates/pr-template.md',
  '.qa-ai/templates/requirement-analysis.template.md',
  '.qa-ai/templates/source-analysis.template.md',
  '.qa-ai/templates/test-design-system.template.md',
  '.qa-ai/templates/test-design-proposal.template.md',
  '.qa-ai/templates/test-management-coverage-analysis.template.md',
  '.qa-ai/templates/test-management-mapping.template.json',
  '.qa-ai/templates/test-management-sync-plan.template.md',
  '.qa-ai/templates/test-management-remote-snapshot.template.md',
  '.qa-ai/templates/test-management-sync-diff.template.md',
  '.qa-ai/templates/test-management-rollback-plan.template.md',
  '.qa-ai/templates/test-management-apply-log.template.md',
  '.qa-ai/templates/imported-requirements.template.md',
  '.qa-ai/templates/imported-cases.template.md',
  '.qa-ai/templates/traceability-matrix.template.md',
  '.qa-ai/templates/release-gate.template.yaml',
  '.qa-ai/templates/test-impact-analysis.template.md',
  '.qa-ai/templates/qa-custom/validate-naming.example.mjs'
];

const requiredAgents = [
  '.qa-ai/agents/README.md',
  '.qa-ai/agents/api-testing-agent.md',
  '.qa-ai/agents/automation-feasibility-agent.md',
  '.qa-ai/agents/gherkin-quality-agent.md',
  '.qa-ai/agents/gherkin-test-design-agent.md',
  '.qa-ai/agents/test-design-system-agent.md',
  '.qa-ai/agents/qa-context-intake-agent.md',
  '.qa-ai/agents/jira-task-agent.md',
  '.qa-ai/agents/pr-agent.md',
  '.qa-ai/agents/qa-workflow-orchestrator.md',
  '.qa-ai/agents/requirements-intake-agent.md',
  '.qa-ai/agents/requirements-normalization-agent.md',
  '.qa-ai/agents/test-management-coverage-agent.md',
  '.qa-ai/agents/test-management-sync-agent.md',
  '.qa-ai/agents/test-management-diff-agent.md',
  '.qa-ai/agents/test-management-apply-agent.md',
  '.qa-ai/agents/webdriverio-implementation-agent.md',
  '.qa-ai/agents/release-gate-agent.md',
  '.qa-ai/agents/test-healing-agent.md',
  '.qa-ai/agents/test-impact-agent.md'
];

const requiredSpecialists = [
  '.qa-ai/agents/specialists/available/appium.md',
  '.qa-ai/agents/specialists/available/cypress.md',
  '.qa-ai/agents/specialists/available/generic-test-design.md',
  '.qa-ai/agents/specialists/available/jira.md',
  '.qa-ai/agents/specialists/available/karate.md',
  '.qa-ai/agents/specialists/available/maestro.md',
  '.qa-ai/agents/specialists/available/playwright-api.md',
  '.qa-ai/agents/specialists/available/playwright-ui.md',
  '.qa-ai/agents/specialists/available/postman.md',
  '.qa-ai/agents/specialists/available/rest-assured.md',
  '.qa-ai/agents/specialists/available/selenium.md',
  '.qa-ai/agents/specialists/available/security.md',
  '.qa-ai/agents/specialists/available/testrail.md',
  '.qa-ai/agents/specialists/available/webdriverio.md'
];

const requiredPresets = [
  '.qa-ai/presets/manual-only.yaml',
  '.qa-ai/presets/karate-full.yaml',
  '.qa-ai/presets/maestro-karate-mobile.yaml',
  '.qa-ai/presets/playwright-full.yaml',
  '.qa-ai/presets/selenium-jest-browserstack.yaml',
  '.qa-ai/presets/webdriverio-playwright-api.yaml'
];

const requiredContracts = [
  '.qa-ai/contracts/workflow.v1.json',
  '.qa-ai/contracts/config.v1.schema.json',
  '.qa-ai/contracts/public-contracts.v1.json'
];

const requiredWorkflows = [
  '.qa-ai/workflows/automation-analysis.md',
  '.qa-ai/workflows/cleanup.md',
  '.qa-ai/workflows/command-interaction.md',
  '.qa-ai/workflows/context-intake.md',
  '.qa-ai/workflows/full-flow.md',
  '.qa-ai/workflows/implementation.md',
  '.qa-ai/workflows/intake.md',
  '.qa-ai/workflows/pr.md',
  '.qa-ai/workflows/test-design.md',
  '.qa-ai/workflows/test-design-system.md',
  '.qa-ai/workflows/test-management-sync.md',
  '.qa-ai/workflows/release-gate.md',
  '.qa-ai/workflows/healing.md'
];

const requiredAdapterTemplates = [
  '.qa-ai/adapters/aider/.aider.conf.yml',
  '.qa-ai/adapters/aider/.aider/README.md',
  '.qa-ai/adapters/claude/agents/qa-workflow-orchestrator.md',
  '.qa-ai/adapters/claude/settings/hooks.json',
  '.qa-ai/adapters/claude/commands/qa-add-tests.md',
  '.qa-ai/adapters/claude/commands/qa-automation-plan.md',
  '.qa-ai/adapters/claude/commands/qa-clean.md',
  '.qa-ai/adapters/claude/commands/qa-config.md',
  '.qa-ai/adapters/claude/commands/qa-coverage.md',
  '.qa-ai/adapters/claude/commands/qa-doctor.md',
  '.qa-ai/adapters/claude/commands/qa-full-flow.md',
  '.qa-ai/adapters/claude/commands/qa-init.md',
  '.qa-ai/adapters/claude/commands/qa-help.md',
  '.qa-ai/adapters/claude/commands/qa-gate.md',
  '.qa-ai/adapters/claude/commands/qa-impact.md',
  '.qa-ai/adapters/claude/commands/qa-quality.md',
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
  '.qa-ai/adapters/goose/recipes/qa-flowkit.yaml',
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
  '.qa-ai/adapters/opencode/commands/qa-help.md',
  '.qa-ai/adapters/opencode/commands/qa-gate.md',
  '.qa-ai/adapters/opencode/commands/qa-impact.md',
  '.qa-ai/adapters/opencode/commands/qa-quality.md',
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
  ['Goose recipe', '.goose/recipes/qa-flowkit.yaml'],
  ['Gemini context', 'GEMINI.md']
];

function pathCheck(level, label, relPath) {
  return { level, label, paths: [relPath] };
}

function anyPathCheck(level, label, relPaths) {
  return { level, label, paths: relPaths, any: true };
}

function isConfiguredFramework(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'manual', 'n/a', 'na'].includes(normalized);
}

function isEnabled(value) {
  return (
    value === true ||
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

function checkLevel(defaultLevel) {
  return strict && defaultLevel === 'optional' ? 'required' : defaultLevel;
}

function isConfiguredTool(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  return Boolean(normalized) && !['none', 'undecided', 'n/a', 'na'].includes(normalized);
}

function addWorkflowArtifactChecks(checks, config) {
  const testManagementTool = getConfigValue(config, 'tools.testManagement', '');
  const issueTracker = getConfigValue(config, 'tools.issueTracker', '');
  const uiFramework = getConfigValue(config, 'automation.ui.framework', 'none');
  const apiFramework = getConfigValue(config, 'automation.api.framework', 'none');
  const hasAutomation = isConfiguredFramework(uiFramework) || isConfiguredFramework(apiFramework);
  const track = normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));
  const proposalPath = getConfigValue(config, 'testDesign.proposalPath', 'qa-ai-output/test-design-proposal.md');
  const isQuickTrack = track === 'quick';

  checks.push(
    pathCheck(checkLevel('optional'), 'requirement analysis artifact', 'qa-ai-output/requirement-analysis.md')
  );
  if (!isQuickTrack) {
    const systemPath = getConfigValue(config, 'testDesign.systemPath', 'qa-ai-output/test-design-system.md');
    checks.push(pathCheck(checkLevel('optional'), 'system test design artifact', systemPath));
  }
  checks.push(
    pathCheck(isQuickTrack ? 'optional' : checkLevel('optional'), 'test design proposal artifact', proposalPath)
  );
  checks.push(pathCheck(checkLevel('optional'), 'PR summary artifact', 'qa-ai-output/pr-summary.md'));

  if (!isQuickTrack && isConfiguredTool(testManagementTool)) {
    checks.push(
      pathCheck(
        checkLevel('optional'),
        'test management coverage artifact',
        'qa-ai-output/test-management-coverage-analysis.md'
      )
    );
    checks.push(
      pathCheck(
        checkLevel('optional'),
        'test management sync plan artifact',
        'qa-ai-output/test-management-sync-plan.md'
      )
    );
  }

  if (hasAutomation) {
    checks.push(
      pathCheck(
        checkLevel('optional'),
        'automation feasibility artifact',
        'qa-ai-output/automation-feasibility-report.md'
      )
    );
    checks.push(
      pathCheck(
        checkLevel('optional'),
        'automation implementation plan artifact',
        'qa-ai-output/automation-implementation-plan.md'
      )
    );
  }

  if (isConfiguredTool(issueTracker)) {
    checks.push(
      pathCheck(checkLevel('optional'), 'issue tracker task draft artifact', 'qa-ai-output/jira-automation-task.md')
    );
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
  const mobileFramework = String(getConfigValue(config, 'automation.mobile.framework', 'none')).toLowerCase();
  const mobileFlowsPath = getConfigValue(config, 'automation.mobile.flowsPath', '');
  const knowledgeEnabled = isEnabled(getConfigValue(config, 'knowledge.enabled', false));
  const knowledgeSourcePath = getConfigValue(config, 'knowledge.sourcePath', '');
  const knowledgeSummaryPath = getConfigValue(config, 'knowledge.summaryPath', 'qa-ai-output/qa-knowledge-summary.md');
  const knowledgeDecisionsPath = getConfigValue(config, 'knowledge.decisionsPath', 'qa-ai-output/qa-init-decisions.md');
  const track = normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));

  checks.push(pathCheck('required', 'configured feature root', featurePath));
  for (const subfolder of FEATURE_SUBFOLDERS) {
    checks.push(
      pathCheck('optional', `feature category folder ${subfolder}`, `${featurePath.replace(/\/$/, '')}/${subfolder}`)
    );
  }
  checks.push(pathCheck('required', 'configured QA output path', path.dirname(matrixPath)));
  checks.push(pathCheck(checkLevel('optional'), 'configured traceability matrix', matrixPath));
  if (mappingFile && track !== 'quick')
    checks.push(pathCheck(checkLevel('optional'), 'configured test management mapping file', mappingFile));
  addWorkflowArtifactChecks(checks, config);

  if (knowledgeEnabled) {
    checks.push(pathCheck('required', 'configured QA context folder', knowledgeSourcePath));
    if (knowledgeSummaryPath)
      checks.push(pathCheck(checkLevel('optional'), 'QA context summary artifact', knowledgeSummaryPath));
    if (knowledgeDecisionsPath)
      checks.push(pathCheck(checkLevel('optional'), 'QA init decisions artifact', knowledgeDecisionsPath));
  }

  if (isConfiguredFramework(uiFramework)) {
    if (uiSpecsPath) checks.push(pathCheck('required', 'configured UI specs path', uiSpecsPath));
    if (uiPageObjectsPath && !isKarateFramework(uiFramework)) {
      checks.push(pathCheck('required', 'configured UI page objects path', uiPageObjectsPath));
    }
  }

  if (isConfiguredFramework(apiFramework)) {
    if (apiSpecsPath) checks.push(pathCheck('required', 'configured API specs path', apiSpecsPath));
  }

  if (isConfiguredFramework(mobileFramework) && mobileFlowsPath) {
    checks.push(pathCheck('required', 'configured mobile flows path', mobileFlowsPath));
  }

  if (usesKarate(config)) {
    const kConfig = karateConfigPath(config);
    checks.push(pathCheck(checkLevel('optional'), 'Karate config file', kConfig));
    for (const root of karateFeatureRoots(config)) {
      checks.push(pathCheck('required', 'Karate feature root', root));
    }
  }

  if (uiFramework === 'webdriverio') {
    checks.push(
      anyPathCheck(checkLevel('optional'), 'WebdriverIO config', [
        'wdio.conf.ts',
        'wdio.conf.js',
        'wdio.conf.mjs',
        'wdio.conf.cjs'
      ])
    );
  }

  if (uiFramework === 'selenium-jest-browserstack' || uiFramework === 'selenium') {
    checks.push(
      anyPathCheck(checkLevel('optional'), 'Jest config', [
        'jest.config.ts',
        'jest.config.js',
        'jest.config.mjs',
        'jest.config.cjs'
      ])
    );
    checks.push(anyPathCheck(checkLevel('optional'), 'BrowserStack config', ['browserstack.yml', 'browserstack.yaml']));
  }

  if ((apiFramework === 'playwright-api' || apiFramework === 'playwright') && !isKarateFramework(apiFramework)) {
    checks.push(
      anyPathCheck(checkLevel('optional'), 'Playwright API config', [
        'playwright.api.config.ts',
        'playwright.api.config.js',
        'playwright.config.ts',
        'playwright.config.js',
        'playwright.config.mjs'
      ])
    );
  }

  if (uiFramework === 'playwright' || uiFramework === 'playwright-ui') {
    checks.push(
      anyPathCheck(checkLevel('optional'), 'Playwright UI config', [
        'playwright.config.ts',
        'playwright.config.js',
        'playwright.config.mjs'
      ])
    );
  }
}

async function runCheck(check) {
  const resolvedPaths = [];
  for (const relPath of check.paths) {
    try {
      resolvedPaths.push(
        resolveRepoPath(cwd, relPath, {
          label: check.label,
          allowRoot: relPath === '.'
        })
      );
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
  logHeader(`QA FlowKit doctor${strict ? ' --strict' : ''}`);
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
    pathCheck('required', 'contracts folder', '.qa-ai/contracts'),
    pathCheck('required', 'scripts folder', '.qa-ai/scripts'),
    pathCheck('required', 'presets folder', '.qa-ai/presets'),
    pathCheck('required', 'adapters folder', '.qa-ai/adapters'),
    pathCheck(genericInstructionsLevel, 'generic agent instructions', 'AGENTS.md'),
    ...requiredScripts.map((relPath) => pathCheck('required', `script ${path.basename(relPath)}`, relPath)),
    pathCheck('required', 'rules index', requiredRulesIndex),
    ...requiredRules.map((relPath) => pathCheck('required', `rule ${path.basename(relPath)}`, relPath)),
    ...requiredTemplates.map((relPath) => pathCheck('required', `template ${path.basename(relPath)}`, relPath)),
    ...requiredContracts.map((relPath) => pathCheck('required', `contract ${path.basename(relPath)}`, relPath)),
    ...requiredAgents.map((relPath) => pathCheck('required', `agent ${path.basename(relPath)}`, relPath)),
    ...requiredSpecialists.map((relPath) => pathCheck('required', `specialist ${path.basename(relPath)}`, relPath)),
    ...requiredPresets.map((relPath) => pathCheck('required', `preset ${path.basename(relPath)}`, relPath)),
    ...requiredWorkflows.map((relPath) => pathCheck('required', `workflow ${path.basename(relPath)}`, relPath)),
    ...requiredAdapterTemplates.map((relPath) =>
      pathCheck('required', `adapter template ${relPath.split('/').slice(2).join('/')}`, relPath)
    ),
    ...generatedAdapters.map(([label, relPath]) => pathCheck('optional', label, relPath))
  ];

  if (configInfo.exists) addConfiguredChecks(checks, configInfo.data);
  if (configInfo.exists) checks.push(pathCheck('optional', 'init manifest', '.qa-ai/state/init-manifest.json'));
  if (configInfo.exists)
    checks.push(pathCheck('required', 'active specialists index', '.qa-ai/agents/specialists/active.md'));

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

  // Legacy artifact alias warnings: warn if old testrail-* artifact paths still exist on disk
  for (const [legacyPath, newPath] of LEGACY_ARTIFACT_ALIASES) {
    const absLegacy = path.join(cwd, legacyPath);
    if (await pathExists(absLegacy)) {
      warned += 1;
      console.log(
        `[WARN] legacy artifact path: '${legacyPath}' found. Rename it to '${newPath}' to follow current conventions.`
      );
    }
  }

  const claudeAdapterDir = path.join(cwd, '.claude');
  if (await pathExists(claudeAdapterDir)) {
    let hooksValid = true;
    let hooksReason = '';
    const settingsPath = path.join(cwd, '.claude/settings.json');
    if (!(await pathExists(settingsPath))) {
      hooksValid = false;
      hooksReason = 'missing settings file';
    } else {
      try {
        const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
        let postEditExists = false;
        if (settings.hooks && Array.isArray(settings.hooks.PostToolUse)) {
          for (const group of settings.hooks.PostToolUse) {
            if (group && Array.isArray(group.hooks)) {
              for (const hook of group.hooks) {
                if (hook && hook.command && String(hook.command).includes('post-edit-validate.mjs')) {
                  postEditExists = true;
                  break;
                }
              }
            }
            if (postEditExists) break;
          }
        }
        let stopGateExists = false;
        if (settings.hooks && Array.isArray(settings.hooks.Stop)) {
          for (const group of settings.hooks.Stop) {
            if (group && Array.isArray(group.hooks)) {
              for (const hook of group.hooks) {
                if (hook && hook.command && String(hook.command).includes('stop-gate.mjs')) {
                  stopGateExists = true;
                  break;
                }
              }
            }
            if (stopGateExists) break;
          }
        }
        if (!postEditExists || !stopGateExists) {
          hooksValid = false;
          hooksReason = 'hooks not registered in settings';
        }
      } catch (err) {
        hooksValid = false;
        hooksReason = `failed to parse settings JSON (${err.message})`;
      }
    }

    if (hooksValid) {
      const { spawnSync } = await import('node:child_process');
      const postEditScript = path.join(cwd, '.qa-ai/scripts/hooks/post-edit-validate.mjs');
      const stopGateScript = path.join(cwd, '.qa-ai/scripts/hooks/stop-gate.mjs');

      if (!(await pathExists(postEditScript)) || !(await pathExists(stopGateScript))) {
        hooksValid = false;
        hooksReason = 'hook scripts not found in framework';
      } else {
        const postEditRes = spawnSync(process.execPath, [postEditScript, '--self-test'], { encoding: 'utf8' });
        const stopGateRes = spawnSync(process.execPath, [stopGateScript, '--self-test'], { encoding: 'utf8' });

        if (postEditRes.status !== 0 || stopGateRes.status !== 0) {
          hooksValid = false;
          hooksReason = 'hook scripts self-test failed';
        }
      }
    }

    if (hooksValid) {
      console.log('[PASS] Claude adapter hooks: configured and verified');
    } else {
      warned += 1;
      console.log(`[WARN] Claude adapter hooks: incomplete or not verified (${hooksReason})`);
    }
  }

  const contractResult = await validateWorkflowContract(cwd);
  if (contractResult.ok) {
    console.log('[PASS] workflow contract: .qa-ai/contracts/workflow.v1.json');
  } else {
    failed += 1;
    for (const error of contractResult.errors) {
      console.log(`[FAIL] workflow contract: ${error}`);
    }
  }

  if (configInfo.exists) {
    const schemaResult = await validateConfigContent(configInfo.content, cwd);
    if (schemaResult.ok) {
      console.log('[PASS] config schema: qa-ai.config.yaml');
    } else {
      failed += 1;
      for (const error of schemaResult.errors) {
        console.log(`[FAIL] config schema: ${error}`);
      }
    }

    const inferredConflicts = inferredAcceptanceCriteriaConflicts(configInfo.data);
    if (inferredConflicts.length === 0) {
      console.log('[PASS] inferred acceptance criteria policy: compatible');
    } else {
      failed += 1;
      for (const conflict of inferredConflicts) {
        console.log(`[FAIL] inferred acceptance criteria policy: conflicting values at ${conflict}`);
      }
    }

    const rawConfig = parseSimpleYaml(configInfo.content, configInfo.path);
    const legacyConfigKeys = collectLegacyConfigSignals(rawConfig);
    if (legacyConfigKeys.length === 0) {
      console.log('[PASS] config legacy keys: none detected');
    } else {
      warned += 1;
      console.log(
        `[WARN] config legacy keys: ${legacyConfigKeys.join(', ')}. Migrate to requirements.inferredAcceptanceCriteria; see ${LEGACY_CONFIG_MIGRATION_DOC}.`
      );
    }

    const changeMeKeys = findChangeMeKeys(configInfo.content);
    if (changeMeKeys.length === 0) {
      console.log('[PASS] config placeholders: no CHANGE_ME values');
    } else {
      failed += 1;
      console.log(`[FAIL] config placeholders: CHANGE_ME remains at ${changeMeKeys.join(', ')}`);
    }

    const customValidators = customValidatorsFromConfig(configInfo.data);
    if (customValidators.length === 0) {
      console.log('[PASS] custom validators: none configured');
    } else {
      const workflowContract = await loadWorkflowContract(cwd);
      const customResult = await validateCustomValidatorConfig(cwd, configInfo.data, {
        contract: workflowContract,
        checkSelfTest: true
      });
      if (customResult.ok) {
        console.log(`[PASS] custom validators: ${customValidators.length} configured and self-tested`);
      } else {
        failed += 1;
        for (const error of customResult.errors) {
          console.log(`[FAIL] custom validators: ${error}`);
        }
      }
    }
  }

  console.log('\nResult:');
  if (failed > 0) {
    console.log(`FAILED - ${failed} required checks failed, ${warned} warnings.`);
    process.exit(1);
  }
  if (warned > 0) {
    console.log(`VALID WITH WARNINGS - ${warned} optional checks missing.`);
  } else {
    console.log('VALID - all checks passed.');
  }

  if (configInfo.exists) {
    const report = await inspectQaWorkflow(cwd);
    const required = report.recommendations.filter((item) => item.priority === 'required');
    if (required.length > 0) {
      console.log('\nSuggested next step:');
      console.log(`  ${required[0].command}`);
      if (required[0].detail) console.log(`  ${required[0].detail}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
