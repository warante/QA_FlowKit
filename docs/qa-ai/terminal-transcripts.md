# Terminal Transcripts

Generated from 18 real commands using a locally packed and installed package, not the npm registry.
Source base: `e0db4148e2d51cb19ba02d8d9f06f356bcb29ca5`; Node `v24.14.1`.
The working tree may include onboarding documentation changes; the SHA is the source base, not a clean-tree attestation.
The displayed `qa-flowkit` aliases the installed Node entrypoint. No model or live agent was executed.
Temporary paths are redacted. JSON blocks contain selected actual fields; other output is verbatim.

Reproduce with `node .github/scripts/capture-onboarding.mjs --output <new-capture.json>`.
Default Playwright and manual examples use separate clean targets. After manual init, the helper copies the public
RF-101 requirement and reviewed artifacts from `test/fixtures/quick-path/` between `run next` and `run check`.
It records the fixture's test-design approval, deliberately copies the invalid Gherkin, then the corrected fixture,
then traceability and PR artifacts. This is fixture replay, not agent generation or independent review.
The corrected historical fixture passes with an advisory folder warning; a new manual case should normally use
`.qa-ai/features/manual/`. The permissive incomplete check is not the final strict gate.
Init here selects `one-per-file`; always inspect the effective config rather than assuming a preset literal.
The doctor's legacy config label is reproduced literally; only `.qa-ai/qa-ai.config.yaml` is runtime input.

## install

Captured stdout. Exit code: 0.

```text
$ qa-flowkit init --no-adapters
.qa-ai/ framework copied successfully.


Next steps to configure QA FlowKit:
  Agent-first:  open your AI coding agent and run /qa-init
  CLI-first:    node .qa-ai/scripts/init.mjs [options]

Example:
  node .qa-ai/scripts/init.mjs --preset playwright-full --project-name "My Project"
```

## default-init

Captured stdout. Exit code: 0.

```text
$ node .qa-ai/scripts/init.mjs --preset playwright-full --no-adapters --no-interactive
=== QA FlowKit init ===

Using base template: playwright-full
Using interface language: en
Using Gherkin language: en
Using Gherkin scenario layout: one-per-file
Using project name: target

Feature category subfolders under .qa-ai/features/ are created when the first .feature file is written.

Skipping starter QA docs. Use --with-doc-templates to generate .qa-ai/output/*.md templates.
Skipping test management mapping file. Use --with-test-management-mapping to create it.

Skipping agent adapter sync.

Init completed. Summary:
created .qa-ai/features
created .qa-ai/output
created .qa-ai/tests/playwright/api
created .qa-ai/tests/playwright/pages
created .qa-ai/tests/playwright/ui
created .qa-ai/tests/playwright/clients
created .qa-ai/tests/playwright/fixtures
created .qa-ai/tests/playwright/helpers
created .qa-ai/tests/playwright/schemas
created .qa-ai/qa-ai.config.yaml
created .qa-ai/agents/specialists/active.md
updated .qa-ai/state/init-manifest.json

Next: node .qa-ai/scripts/doctor.mjs
```

## manual-install

Captured stdout. Exit code: 0.

```text
$ qa-flowkit init --no-adapters
.qa-ai/ framework copied successfully.


Next steps to configure QA FlowKit:
  Agent-first:  open your AI coding agent and run /qa-init
  CLI-first:    node .qa-ai/scripts/init.mjs [options]

Example:
  node .qa-ai/scripts/init.mjs --preset playwright-full --project-name "My Project"
```

## manual-init

Captured stdout. Exit code: 0.

```text
$ node .qa-ai/scripts/init.mjs --preset manual-only --qa-track quick --adapters generic --no-interactive
=== QA FlowKit init ===

Using base template: manual-only
Using interface language: en
Using Gherkin language: en
Using Gherkin scenario layout: one-per-file
Using project name: manual

Feature category subfolders under .qa-ai/features/ are created when the first .feature file is written.

Skipping starter QA docs. Use --with-doc-templates to generate .qa-ai/output/*.md templates.
Skipping test management mapping file. Use --with-test-management-mapping to create it.

Syncing agent adapters...
Selected adapters: generic

=== Sync agent adapters ===

Adapter generic:
  copied  AGENTS.md

updated .qa-ai/state/init-manifest.json

Init completed. Summary:
created .qa-ai/features
created .qa-ai/output
created .qa-ai/qa-ai.config.yaml
created .qa-ai/agents/specialists/active.md
updated .qa-ai/state/init-manifest.json

Next: node .qa-ai/scripts/doctor.mjs
```

## doctor

Captured stdout. Exit code: 0.

```text
$ qa-flowkit doctor
=== QA FlowKit doctor ===

[PASS] config: qa-ai.config.yaml or .qa-ai/qa-ai.config.yaml
[PASS] framework folder: .qa-ai
[PASS] agents folder: .qa-ai/agents
[PASS] rules folder: .qa-ai/rules
[PASS] templates folder: .qa-ai/templates
[PASS] contracts folder: .qa-ai/contracts
[PASS] scripts folder: .qa-ai/scripts
[PASS] presets folder: .qa-ai/presets
[PASS] adapters folder: .qa-ai/adapters
[PASS] generic agent instructions: AGENTS.md
[PASS] script bootstrap-agent-adapters.mjs: .qa-ai/scripts/bootstrap-agent-adapters.mjs
[PASS] script clean.mjs: .qa-ai/scripts/clean.mjs
[PASS] script config.mjs: .qa-ai/scripts/config.mjs
[PASS] script doctor.mjs: .qa-ai/scripts/doctor.mjs
[PASS] script export-report.mjs: .qa-ai/scripts/export-report.mjs
[PASS] script init.mjs: .qa-ai/scripts/init.mjs
[PASS] script agent-guidance-contract.mjs: .qa-ai/scripts/lib/agent-guidance-contract.mjs
[PASS] script config-schema.mjs: .qa-ai/scripts/lib/config-schema.mjs
[PASS] script custom-validators.mjs: .qa-ai/scripts/lib/custom-validators.mjs
[PASS] script detect-adapters.mjs: .qa-ai/scripts/lib/detect-adapters.mjs
[PASS] script harness-context.mjs: .qa-ai/scripts/lib/harness-context.mjs
[PASS] script harness-contract.mjs: .qa-ai/scripts/lib/harness-contract.mjs
[PASS] script harness-controller.mjs: .qa-ai/scripts/lib/harness-controller.mjs
[PASS] script harness-messages.mjs: .qa-ai/scripts/lib/harness-messages.mjs
[PASS] script harness-modification.mjs: .qa-ai/scripts/lib/harness-modification.mjs
[PASS] script harness-paths.mjs: .qa-ai/scripts/lib/harness-paths.mjs
[PASS] script harness-permissions.mjs: .qa-ai/scripts/lib/harness-permissions.mjs
[PASS] script harness-run-store.mjs: .qa-ai/scripts/lib/harness-run-store.mjs
[PASS] script harness-validation.mjs: .qa-ai/scripts/lib/harness-validation.mjs
[PASS] script harness-validator-allowlist.mjs: .qa-ai/scripts/lib/harness-validator-allowlist.mjs
[PASS] script injection-patterns.mjs: .qa-ai/scripts/lib/injection-patterns.mjs
[PASS] script json-schema-lite.mjs: .qa-ai/scripts/lib/json-schema-lite.mjs
[PASS] script maestro-validate.mjs: .qa-ai/scripts/lib/maestro-validate.mjs
[PASS] script markdown-table.mjs: .qa-ai/scripts/lib/markdown-table.mjs
[PASS] script mobile-automation.mjs: .qa-ai/scripts/lib/mobile-automation.mjs
[PASS] script project-config.mjs: .qa-ai/scripts/lib/project-config.mjs
[PASS] script qa-next-steps.mjs: .qa-ai/scripts/lib/qa-next-steps.mjs
[PASS] script quality-report.mjs: .qa-ai/scripts/lib/quality-report.mjs
[PASS] script release-gate.mjs: .qa-ai/scripts/lib/release-gate.mjs
[PASS] script test-coverage.mjs: .qa-ai/scripts/lib/test-coverage.mjs
[PASS] script test-design.mjs: .qa-ai/scripts/lib/test-design.mjs
[PASS] script test-management-mapping.mjs: .qa-ai/scripts/lib/test-management-mapping.mjs
[PASS] script utils.mjs: .qa-ai/scripts/lib/utils.mjs
[PASS] script organize-features.mjs: .qa-ai/scripts/organize-features.mjs
[PASS] script pr-summary.mjs: .qa-ai/scripts/pr-summary.mjs
[PASS] script qa-help.mjs: .qa-ai/scripts/qa-help.mjs
[PASS] script qa-metrics.mjs: .qa-ai/scripts/qa-metrics.mjs
[PASS] script qa-run.mjs: .qa-ai/scripts/qa-run.mjs
[PASS] script smoke-npm-pack.mjs: .qa-ai/scripts/smoke-npm-pack.mjs
[PASS] script smoke-test.mjs: .qa-ai/scripts/smoke-test.mjs
[PASS] script sync-agent-adapters.mjs: .qa-ai/scripts/sync-agent-adapters.mjs
[PASS] script test-validators.mjs: .qa-ai/scripts/test-validators.mjs
[PASS] script validate-active-specialists.mjs: .qa-ai/scripts/validate-active-specialists.mjs
[PASS] script validate-agent-guidance.mjs: .qa-ai/scripts/validate-agent-guidance.mjs
[PASS] script validate-config.mjs: .qa-ai/scripts/validate-config.mjs
[PASS] script validate-defect-triage.mjs: .qa-ai/scripts/validate-defect-triage.mjs
[PASS] script validate-environment-readiness.mjs: .qa-ai/scripts/validate-environment-readiness.mjs
[PASS] script validate-execution-evidence.mjs: .qa-ai/scripts/validate-execution-evidence.mjs
[PASS] script validate-execution-plan.mjs: .qa-ai/scripts/validate-execution-plan.mjs
[PASS] script validate-execution-summary.mjs: .qa-ai/scripts/validate-execution-summary.mjs
[PASS] script validate-external-intake.mjs: .qa-ai/scripts/validate-external-intake.mjs
[PASS] script validate-features.mjs: .qa-ai/scripts/validate-features.mjs
[PASS] script validate-healing-log.mjs: .qa-ai/scripts/validate-healing-log.mjs
[PASS] script validate-karate-features.mjs: .qa-ai/scripts/validate-karate-features.mjs
[PASS] script validate-learning-log.mjs: .qa-ai/scripts/validate-learning-log.mjs
[PASS] script validate-maestro-flows.mjs: .qa-ai/scripts/validate-maestro-flows.mjs
[PASS] script validate-observability-intake.mjs: .qa-ai/scripts/validate-observability-intake.mjs
[PASS] script validate-quality-report.mjs: .qa-ai/scripts/validate-quality-report.mjs
[PASS] script validate-release-gate.mjs: .qa-ai/scripts/validate-release-gate.mjs
[PASS] script validate-result-analysis.mjs: .qa-ai/scripts/validate-result-analysis.mjs
[PASS] script validate-risk-analysis.mjs: .qa-ai/scripts/validate-risk-analysis.mjs
[PASS] script validate-strategy-routing.mjs: .qa-ai/scripts/validate-strategy-routing.mjs
[PASS] script validate-sync-diff.mjs: .qa-ai/scripts/validate-sync-diff.mjs
[PASS] script validate-sync-plan.mjs: .qa-ai/scripts/validate-sync-plan.mjs
[PASS] script validate-sync-result.mjs: .qa-ai/scripts/validate-sync-result.mjs
[PASS] script validate-target.mjs: .qa-ai/scripts/validate-target.mjs
[PASS] script validate-test-coverage.mjs: .qa-ai/scripts/validate-test-coverage.mjs
[PASS] script validate-test-data-plan.mjs: .qa-ai/scripts/validate-test-data-plan.mjs
[PASS] script validate-test-design.mjs: .qa-ai/scripts/validate-test-design.mjs
[PASS] script validate-test-impact.mjs: .qa-ai/scripts/validate-test-impact.mjs
[PASS] script validate-traceability.mjs: .qa-ai/scripts/validate-traceability.mjs
[PASS] script validate-untrusted-content.mjs: .qa-ai/scripts/validate-untrusted-content.mjs
[PASS] rules index: .qa-ai/rules/README.md
[PASS] rule ai-testing.rules.md: .qa-ai/rules/ai-testing.rules.md
[PASS] rule approval.rules.md: .qa-ai/rules/approval.rules.md
[PASS] rule api-testing.rules.md: .qa-ai/rules/api-testing.rules.md
[PASS] rule automation.rules.md: .qa-ai/rules/automation.rules.md
[PASS] rule cleanup.rules.md: .qa-ai/rules/cleanup.rules.md
[PASS] rule defect.rules.md: .qa-ai/rules/defect.rules.md
[PASS] rule gherkin-quality.rubric.md: .qa-ai/rules/gherkin-quality.rubric.md
[PASS] rule gherkin.rules.md: .qa-ai/rules/gherkin.rules.md
[PASS] rule karate.rules.md: .qa-ai/rules/karate.rules.md
[PASS] rule mobile-automation.rules.md: .qa-ai/rules/mobile-automation.rules.md
[PASS] rule issue-tracker.rules.md: .qa-ai/rules/issue-tracker.rules.md
[PASS] rule release-gate.rules.md: .qa-ai/rules/release-gate.rules.md
[PASS] rule requirements.rules.md: .qa-ai/rules/requirements.rules.md
[PASS] rule specialist-common.rules.md: .qa-ai/rules/specialist-common.rules.md
[PASS] rule test-design.rules.md: .qa-ai/rules/test-design.rules.md
[PASS] rule test-management.rules.md: .qa-ai/rules/test-management.rules.md
[PASS] rule untrusted-content.rules.md: .qa-ai/rules/untrusted-content.rules.md
[PASS] rule ui-automation.rules.md: .qa-ai/rules/ui-automation.rules.md
[PASS] rule workflow.rules.md: .qa-ai/rules/workflow.rules.md
[PASS] template automation-feasibility-report.template.md: .qa-ai/templates/automation-feasibility-report.template.md
[PASS] template automation-implementation-plan.template.md: .qa-ai/templates/automation-implementation-plan.template.md
[PASS] template feature.template: .qa-ai/templates/feature.template
[PASS] template gherkin-quality-report.template.md: .qa-ai/templates/gherkin-quality-report.template.md
[PASS] template jira-automation-task.template.md: .qa-ai/templates/jira-automation-task.template.md
[PASS] template pr-template.md: .qa-ai/templates/pr-template.md
[PASS] template requirement-analysis.template.md: .qa-ai/templates/requirement-analysis.template.md
[PASS] template source-analysis.template.md: .qa-ai/templates/source-analysis.template.md
[PASS] template test-design-system.template.md: .qa-ai/templates/test-design-system.template.md
[PASS] template test-design-proposal.template.md: .qa-ai/templates/test-design-proposal.template.md
[PASS] template test-management-coverage-analysis.template.md: .qa-ai/templates/test-management-coverage-analysis.template.md
[PASS] template test-management-mapping.template.json: .qa-ai/templates/test-management-mapping.template.json
[PASS] template test-management-sync-plan.template.md: .qa-ai/templates/test-management-sync-plan.template.md
[PASS] template test-management-remote-snapshot.template.md: .qa-ai/templates/test-management-remote-snapshot.template.md
[PASS] template test-management-sync-diff.template.md: .qa-ai/templates/test-management-sync-diff.template.md
[PASS] template test-management-rollback-plan.template.md: .qa-ai/templates/test-management-rollback-plan.template.md
[PASS] template test-management-apply-log.template.md: .qa-ai/templates/test-management-apply-log.template.md
[PASS] template imported-requirements.template.md: .qa-ai/templates/imported-requirements.template.md
[PASS] template imported-cases.template.md: .qa-ai/templates/imported-cases.template.md
[PASS] template traceability-matrix.template.md: .qa-ai/templates/traceability-matrix.template.md
[PASS] template release-gate.template.yaml: .qa-ai/templates/release-gate.template.yaml
[PASS] template test-impact-analysis.template.md: .qa-ai/templates/test-impact-analysis.template.md
[PASS] template validate-naming.example.mjs: .qa-ai/templates/qa-custom/validate-naming.example.mjs
[PASS] contract workflow.v1.json: .qa-ai/contracts/workflow.v1.json
[PASS] contract config.v1.schema.json: .qa-ai/contracts/config.v1.schema.json
[PASS] contract agent-guidance.v1.json: .qa-ai/contracts/agent-guidance.v1.json
[PASS] contract agent-guidance.v1.schema.json: .qa-ai/contracts/agent-guidance.v1.schema.json
[PASS] contract public-contracts.v1.json: .qa-ai/contracts/public-contracts.v1.json
[PASS] agent README.md: .qa-ai/agents/README.md
[PASS] agent api-testing-agent.md: .qa-ai/agents/api-testing-agent.md
[PASS] agent automation-feasibility-agent.md: .qa-ai/agents/automation-feasibility-agent.md
[PASS] agent gherkin-quality-agent.md: .qa-ai/agents/gherkin-quality-agent.md
[PASS] agent gherkin-test-design-agent.md: .qa-ai/agents/gherkin-test-design-agent.md
[PASS] agent test-design-system-agent.md: .qa-ai/agents/test-design-system-agent.md
[PASS] agent qa-context-intake-agent.md: .qa-ai/agents/qa-context-intake-agent.md
[PASS] agent jira-task-agent.md: .qa-ai/agents/jira-task-agent.md
[PASS] agent pr-agent.md: .qa-ai/agents/pr-agent.md
[PASS] agent qa-workflow-orchestrator.md: .qa-ai/agents/qa-workflow-orchestrator.md
[PASS] agent requirements-intake-agent.md: .qa-ai/agents/requirements-intake-agent.md
[PASS] agent requirements-normalization-agent.md: .qa-ai/agents/requirements-normalization-agent.md
[PASS] agent test-management-coverage-agent.md: .qa-ai/agents/test-management-coverage-agent.md
[PASS] agent test-management-sync-agent.md: .qa-ai/agents/test-management-sync-agent.md
[PASS] agent test-management-diff-agent.md: .qa-ai/agents/test-management-diff-agent.md
[PASS] agent test-management-apply-agent.md: .qa-ai/agents/test-management-apply-agent.md
[PASS] agent ui-implementation-agent.md: .qa-ai/agents/ui-implementation-agent.md
[PASS] agent release-gate-agent.md: .qa-ai/agents/release-gate-agent.md
[PASS] agent test-healing-agent.md: .qa-ai/agents/test-healing-agent.md
[PASS] agent test-impact-agent.md: .qa-ai/agents/test-impact-agent.md
[PASS] specialist appium.md: .qa-ai/agents/specialists/available/appium.md
[PASS] specialist cypress.md: .qa-ai/agents/specialists/available/cypress.md
[PASS] specialist generic-test-design.md: .qa-ai/agents/specialists/available/generic-test-design.md
[PASS] specialist jira.md: .qa-ai/agents/specialists/available/jira.md
[PASS] specialist karate.md: .qa-ai/agents/specialists/available/karate.md
[PASS] specialist maestro.md: .qa-ai/agents/specialists/available/maestro.md
[PASS] specialist playwright-api.md: .qa-ai/agents/specialists/available/playwright-api.md
[PASS] specialist playwright-ui.md: .qa-ai/agents/specialists/available/playwright-ui.md
[PASS] specialist postman.md: .qa-ai/agents/specialists/available/postman.md
[PASS] specialist rest-assured.md: .qa-ai/agents/specialists/available/rest-assured.md
[PASS] specialist selenium.md: .qa-ai/agents/specialists/available/selenium.md
[PASS] specialist functional-security.md: .qa-ai/agents/specialists/available/functional-security.md
[PASS] specialist testrail.md: .qa-ai/agents/specialists/available/testrail.md
[PASS] specialist webdriverio.md: .qa-ai/agents/specialists/available/webdriverio.md
[PASS] preset manual-only.yaml: .qa-ai/presets/manual-only.yaml
[PASS] preset karate-full.yaml: .qa-ai/presets/karate-full.yaml
[PASS] preset maestro-karate-mobile.yaml: .qa-ai/presets/maestro-karate-mobile.yaml
[PASS] preset playwright-full.yaml: .qa-ai/presets/playwright-full.yaml
[PASS] preset selenium-jest-browserstack.yaml: .qa-ai/presets/selenium-jest-browserstack.yaml
[PASS] workflow automation-analysis.md: .qa-ai/workflows/automation-analysis.md
[PASS] workflow cleanup.md: .qa-ai/workflows/cleanup.md
[PASS] workflow command-interaction.md: .qa-ai/workflows/command-interaction.md
[PASS] workflow context-intake.md: .qa-ai/workflows/context-intake.md
[PASS] workflow full-flow.md: .qa-ai/workflows/full-flow.md
[PASS] workflow implementation.md: .qa-ai/workflows/implementation.md
[PASS] workflow intake.md: .qa-ai/workflows/intake.md
[PASS] workflow pr.md: .qa-ai/workflows/pr.md
[PASS] workflow test-design.md: .qa-ai/workflows/test-design.md
[PASS] workflow test-design-system.md: .qa-ai/workflows/test-design-system.md
[PASS] workflow test-management-sync.md: .qa-ai/workflows/test-management-sync.md
[PASS] workflow release-gate.md: .qa-ai/workflows/release-gate.md
[PASS] workflow healing.md: .qa-ai/workflows/healing.md
[PASS] adapter template aider/.aider.conf.yml: .qa-ai/adapters/aider/.aider.conf.yml
[PASS] adapter template aider/.aider/README.md: .qa-ai/adapters/aider/.aider/README.md
[PASS] adapter template claude/agents/qa-workflow-orchestrator.md: .qa-ai/adapters/claude/agents/qa-workflow-orchestrator.md
[PASS] adapter template claude/settings/hooks.json: .qa-ai/adapters/claude/settings/hooks.json
[PASS] adapter template cline/.clinerules: .qa-ai/adapters/cline/.clinerules
[PASS] adapter template cline/.cline/README.md: .qa-ai/adapters/cline/.cline/README.md
[PASS] adapter template codex/README.md: .qa-ai/adapters/codex/README.md
[PASS] adapter template codex/prompts/implement-project.md: .qa-ai/adapters/codex/prompts/implement-project.md
[PASS] adapter template continue/README.md: .qa-ai/adapters/continue/README.md
[PASS] adapter template continue/checks/qa-feature-conventions.md: .qa-ai/adapters/continue/checks/qa-feature-conventions.md
[PASS] adapter template generic/AGENTS.md: .qa-ai/adapters/generic/AGENTS.md
[PASS] adapter template gemini/GEMINI.md: .qa-ai/adapters/gemini/GEMINI.md
[PASS] adapter template goose/recipes/qa-flowkit.yaml: .qa-ai/adapters/goose/recipes/qa-flowkit.yaml
[PASS] adapter template opencode/README.md: .qa-ai/adapters/opencode/README.md
[PASS] adapter template opencode/agents/qa-workflow.md: .qa-ai/adapters/opencode/agents/qa-workflow.md
[PASS] adapter template shared/commands: .qa-ai/adapters/shared/commands
[PASS] adapter template claude/commands/qa-add-tests.md: .qa-ai/adapters/claude/commands/qa-add-tests.md
[PASS] adapter template claude/commands/qa-automation-plan.md: .qa-ai/adapters/claude/commands/qa-automation-plan.md
[PASS] adapter template claude/commands/qa-clean.md: .qa-ai/adapters/claude/commands/qa-clean.md
[PASS] adapter template claude/commands/qa-config.md: .qa-ai/adapters/claude/commands/qa-config.md
[PASS] adapter template claude/commands/qa-coverage.md: .qa-ai/adapters/claude/commands/qa-coverage.md
[PASS] adapter template claude/commands/qa-doctor.md: .qa-ai/adapters/claude/commands/qa-doctor.md
[PASS] adapter template claude/commands/qa-enable-enterprise.md: .qa-ai/adapters/claude/commands/qa-enable-enterprise.md
[PASS] adapter template claude/commands/qa-execute.md: .qa-ai/adapters/claude/commands/qa-execute.md
[PASS] adapter template claude/commands/qa-full-flow.md: .qa-ai/adapters/claude/commands/qa-full-flow.md
[PASS] adapter template claude/commands/qa-gate.md: .qa-ai/adapters/claude/commands/qa-gate.md
[PASS] adapter template claude/commands/qa-help.md: .qa-ai/adapters/claude/commands/qa-help.md
[PASS] adapter template claude/commands/qa-impact.md: .qa-ai/adapters/claude/commands/qa-impact.md
[PASS] adapter template claude/commands/qa-init.md: .qa-ai/adapters/claude/commands/qa-init.md
[PASS] adapter template claude/commands/qa-quality.md: .qa-ai/adapters/claude/commands/qa-quality.md
[PASS] adapter template claude/commands/qa-status.md: .qa-ai/adapters/claude/commands/qa-status.md
[PASS] adapter template claude/commands/qa-update-tests.md: .qa-ai/adapters/claude/commands/qa-update-tests.md
[PASS] adapter template claude/commands/qa-validate-features.md: .qa-ai/adapters/claude/commands/qa-validate-features.md
[PASS] adapter template claude/commands/qa-validate-karate-features.md: .qa-ai/adapters/claude/commands/qa-validate-karate-features.md
[PASS] adapter template opencode/commands/qa-add-tests.md: .qa-ai/adapters/opencode/commands/qa-add-tests.md
[PASS] adapter template opencode/commands/qa-automation-plan.md: .qa-ai/adapters/opencode/commands/qa-automation-plan.md
[PASS] adapter template opencode/commands/qa-clean.md: .qa-ai/adapters/opencode/commands/qa-clean.md
[PASS] adapter template opencode/commands/qa-config.md: .qa-ai/adapters/opencode/commands/qa-config.md
[PASS] adapter template opencode/commands/qa-coverage.md: .qa-ai/adapters/opencode/commands/qa-coverage.md
[PASS] adapter template opencode/commands/qa-doctor.md: .qa-ai/adapters/opencode/commands/qa-doctor.md
[PASS] adapter template opencode/commands/qa-enable-enterprise.md: .qa-ai/adapters/opencode/commands/qa-enable-enterprise.md
[PASS] adapter template opencode/commands/qa-execute.md: .qa-ai/adapters/opencode/commands/qa-execute.md
[PASS] adapter template opencode/commands/qa-full-flow.md: .qa-ai/adapters/opencode/commands/qa-full-flow.md
[PASS] adapter template opencode/commands/qa-gate.md: .qa-ai/adapters/opencode/commands/qa-gate.md
[PASS] adapter template opencode/commands/qa-help.md: .qa-ai/adapters/opencode/commands/qa-help.md
[PASS] adapter template opencode/commands/qa-impact.md: .qa-ai/adapters/opencode/commands/qa-impact.md
[PASS] adapter template opencode/commands/qa-init.md: .qa-ai/adapters/opencode/commands/qa-init.md
[PASS] adapter template opencode/commands/qa-quality.md: .qa-ai/adapters/opencode/commands/qa-quality.md
[PASS] adapter template opencode/commands/qa-status.md: .qa-ai/adapters/opencode/commands/qa-status.md
[PASS] adapter template opencode/commands/qa-update-tests.md: .qa-ai/adapters/opencode/commands/qa-update-tests.md
[PASS] adapter template opencode/commands/qa-validate-features.md: .qa-ai/adapters/opencode/commands/qa-validate-features.md
[PASS] adapter template opencode/commands/qa-validate-karate-features.md: .qa-ai/adapters/opencode/commands/qa-validate-karate-features.md
[WARN] Claude adapter: .claude
[WARN] Codex adapter: .codex
[WARN] OpenCode adapter: .opencode
[WARN] Cline rules: .clinerules
[WARN] Cline docs: .cline
[WARN] Continue adapter: .continue
[WARN] Aider config: .aider.conf.yml
[WARN] Aider docs: .aider
[WARN] Goose recipe: .goose/recipes/qa-flowkit.yaml
[WARN] Gemini context: GEMINI.md
[PASS] configured feature root: .qa-ai/features
[WARN] feature category folder functional: .qa-ai/features/functional
[WARN] feature category folder integration: .qa-ai/features/integration
[WARN] feature category folder e2e: .qa-ai/features/e2e
[WARN] feature category folder api: .qa-ai/features/api
[WARN] feature category folder accessibility: .qa-ai/features/accessibility
[WARN] feature category folder security: .qa-ai/features/security
[WARN] feature category folder manual: .qa-ai/features/manual
[PASS] configured QA output path: .qa-ai/output
[WARN] configured traceability matrix: .qa-ai/output/traceability-matrix.md
[WARN] requirement analysis artifact: .qa-ai/output/requirement-analysis.md
[WARN] test design proposal artifact: .qa-ai/output/test-design-proposal.md
[WARN] PR summary artifact: .qa-ai/output/pr-summary.md
[PASS] init manifest: .qa-ai/state/init-manifest.json
[PASS] active specialists index: .qa-ai/agents/specialists/active.md
[PASS] workflow contract: .qa-ai/contracts/workflow.v1.json
[PASS] guidance integrity: state=valid, 77 entries registered
[PASS] config schema: qa-ai.config.yaml
[PASS] config legacy keys: none detected
[PASS] config placeholders: no CHANGE_ME values
[PASS] custom validators: none configured
[PASS] observability: disabled (enable in config for shift-right testing)

Result:
VALID WITH WARNINGS - 21 optional checks missing.

Suggested next step:
  /qa-full-flow
  Load requirements-intake-agent.md and .qa-ai/workflows/intake.md.
```

## incomplete

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit validate-target --allow-empty --allow-missing --no-strict-doctor --json
{
  "ok": true,
  "validators": [
    {
      "name": "doctor",
      "status": "passed"
    },
    {
      "name": "feature validation",
      "status": "passed"
    },
    {
      "name": "traceability validation",
      "status": "passed"
    },
    {
      "name": "untrusted content scan",
      "status": "passed"
    },
    {
      "name": "active specialist validation",
      "status": "passed"
    }
  ]
}
```

## start

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run start --rf RF-101 --json
{
  "track": "quick",
  "status": "active",
  "rfId": "RF-101"
}
```

## intake

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run check --json
{
  "ok": true,
  "phaseId": "intake",
  "status": "active"
}
```

## normalize

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run check --json
{
  "ok": true,
  "phaseId": "normalize",
  "status": "active"
}
```

## approve

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run approve test-design --note "RF-101 quick-path design approved" --json
{
  "approvals": [
    {
      "gate": "test-design",
      "decision": "approved"
    }
  ]
}
```

## invalid

Selected actual fields. Exit code: 1.

```text
$ qa-flowkit run check --json
{
  "ok": false,
  "phaseId": "gherkin",
  "validation": {
    "ok": false,
    "results": [
      {
        "validatorId": "validate-features",
        "ok": false,
        "exitCode": 1,
        "diagnostics": "=== QA AI feature validator ===\n\n\nFAILED - 2 validation error(s).\n\n.qa-ai/features/functional/RF-101-TC-001-login.feature: Missing required tag value @manual:<value>\n.qa-ai/features/functional/RF-101-TC-001-login.feature: Scenario \"RF-101 TC-001 Successful login\" is missing required tag value @manual:<value>."
      }
    ]
  }
}
```

## corrected

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run check --json
{
  "ok": true,
  "phaseId": "gherkin",
  "status": "active"
}
```

## feature

Captured stdout. Exit code: 0.

```text
$ qa-flowkit validate-features
=== QA AI feature validator ===

WARNING: .qa-ai/features/functional/RF-101-TC-001-login.feature: Expected folder "manual/" based on @type/@manual tags, but file is under "functional/".

VALID - all feature files passed.
```

## traceability

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run check --json
{
  "ok": true,
  "phaseId": "traceability",
  "status": "active"
}
```

## pr

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run check --json
{
  "ok": true,
  "phaseId": "pr",
  "status": "completed"
}
```

## completed

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit run status --json
{
  "rfId": "RF-101",
  "status": "completed",
  "phases": [
    {
      "id": "intake",
      "status": "completed"
    },
    {
      "id": "normalize",
      "status": "completed"
    },
    {
      "id": "gherkin",
      "status": "completed"
    },
    {
      "id": "traceability",
      "status": "completed"
    },
    {
      "id": "pr",
      "status": "completed"
    }
  ]
}
```

## target

Selected actual fields. Exit code: 0.

```text
$ qa-flowkit validate-target --json
{
  "ok": true,
  "validators": [
    {
      "name": "doctor",
      "status": "passed"
    },
    {
      "name": "feature validation",
      "status": "passed"
    },
    {
      "name": "traceability validation",
      "status": "passed"
    },
    {
      "name": "untrusted content scan",
      "status": "passed"
    },
    {
      "name": "active specialist validation",
      "status": "passed"
    },
    {
      "name": "secret scan",
      "status": "passed"
    }
  ]
}
```

## bootstrap

Captured stdout. Exit code: 0.

```text
$ node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
=== QA FlowKit agent bootstrap ===

claude: copied  .claude/commands/qa-init.md
  created .claude/settings.json
opencode: copied  .opencode/commands/qa-init.md
updated .qa-ai/state/init-manifest.json

Next: open Claude Code or OpenCode in this repository and run:
/qa-init

Advanced example for a manual-only QA setup:
/qa-init --preset manual-only --adapters claude,opencode
```
