import { adapterCommandTemplatePaths } from '../inventory-manifest.mjs';

export const requiredRulesIndex = '.qa-ai/rules/README.md';

export const requiredRules = [
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
  '.qa-ai/rules/specialist-common.rules.md',
  '.qa-ai/rules/test-design.rules.md',
  '.qa-ai/rules/test-management.rules.md',
  '.qa-ai/rules/untrusted-content.rules.md',
  '.qa-ai/rules/ui-automation.rules.md',
  '.qa-ai/rules/workflow.rules.md'
];

export const requiredTemplates = [
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

export const requiredAgents = [
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
  '.qa-ai/agents/ui-implementation-agent.md',
  '.qa-ai/agents/release-gate-agent.md',
  '.qa-ai/agents/test-healing-agent.md',
  '.qa-ai/agents/test-impact-agent.md'
];

export const requiredSpecialists = [
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
  '.qa-ai/agents/specialists/available/functional-security.md',
  '.qa-ai/agents/specialists/available/testrail.md',
  '.qa-ai/agents/specialists/available/webdriverio.md'
];

export const requiredPresets = [
  '.qa-ai/presets/manual-only.yaml',
  '.qa-ai/presets/karate-full.yaml',
  '.qa-ai/presets/maestro-karate-mobile.yaml',
  '.qa-ai/presets/playwright-full.yaml',
  '.qa-ai/presets/selenium-jest-browserstack.yaml'
];

export const requiredContracts = [
  '.qa-ai/contracts/workflow.v1.json',
  '.qa-ai/contracts/config.v1.schema.json',
  '.qa-ai/contracts/agent-guidance.v1.json',
  '.qa-ai/contracts/agent-guidance.v1.schema.json',
  '.qa-ai/contracts/public-contracts.v1.json'
];

export const requiredWorkflows = [
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

export const requiredAdapterTemplates = [
  '.qa-ai/adapters/aider/.aider.conf.yml',
  '.qa-ai/adapters/aider/.aider/README.md',
  '.qa-ai/adapters/claude/agents/qa-workflow-orchestrator.md',
  '.qa-ai/adapters/claude/settings/hooks.json',
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
  '.qa-ai/adapters/shared/commands',
  ...adapterCommandTemplatePaths()
];

export const generatedAdapters = [
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
