import path from 'node:path';
import { pathCheck } from './report.mjs';
import { validateWorkflowContract } from '../harness-contract.mjs';

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
  '.qa-ai/agents/ui-implementation-agent.md',
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
  '.qa-ai/adapters/claude/commands/qa-enable-enterprise.md',
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
  '.qa-ai/adapters/opencode/commands/qa-enable-enterprise.md',
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

export function buildFrameworkChecks({ isFrameworkSourceRepo, strict }) {
  const configLevel = isFrameworkSourceRepo && !strict ? 'optional' : 'required';
  const genericInstructionsLevel = isFrameworkSourceRepo ? 'required' : 'optional';
  return [
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
}

export async function runWorkflowContractCheck(cwd) {
  let failed = 0;
  const contractResult = await validateWorkflowContract(cwd);
  if (contractResult.ok) {
    console.log('[PASS] workflow contract: .qa-ai/contracts/workflow.v1.json');
  } else {
    failed += 1;
    for (const error of contractResult.errors) {
      console.log(`[FAIL] workflow contract: ${error}`);
    }
  }
  return { failed };
}
