# QA AI Agent Loading Protocol

This directory contains Markdown role instructions for the QA AI workflow. Some tools expose these files as callable subagents; others only read them as project documentation. In both cases, load the relevant files before starting a workflow phase.

Related docs: [main README](../../README.md) | [workflow](../../docs/qa-ai/workflow.md) | [agent compatibility](../../docs/qa-ai/agent-compatibility.md) | [customizing agents](../../docs/qa-ai/customizing-agents.md)

Reusable repository configuration profiles can be imported or exported with `node .qa-ai/scripts/config.mjs`; after import, reload `qa-ai.config.yaml` and `.qa-ai/agents/specialists/active.md`.

## Load Order

| Order | File                                                                                 | Purpose                                                                |
| ----- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 1     | `.qa-ai/agents/qa-workflow-orchestrator.md`                                          | Coordinates the full QA flow (15 numbered phases plus optional agents) |
| 2     | `knowledge.summaryPath` / `knowledge.decisionsPath` when `knowledge.enabled` is true | Adds team QA working-practice guidance                                 |
| 3     | `.qa-ai/agents/specialists/active.md` when present                                   | Lists active specialists for the current config                        |
| 4     | Files listed in `active.md`                                                          | Adds tool/framework-specific guidance                                  |
| 5     | Matching phase agent                                                                 | Applies phase-specific rules                                           |

## Phase Agents (orchestrator sequence)

This table mirrors the 15-phase sequence in `qa-workflow-orchestrator.md`, which is the single source of truth for phase numbering. Mobile implementation is part of phase 11 (UI/E2E implementation): it uses the UI implementation agent plus the active mobile specialist.

| #   | Phase                            | Agent File                                          |
| --- | -------------------------------- | --------------------------------------------------- |
| 1   | QA context intake                | `.qa-ai/agents/qa-context-intake-agent.md`          |
| 2   | Requirements intake              | `.qa-ai/agents/requirements-intake-agent.md`        |
| 3   | Requirements normalization       | `.qa-ai/agents/requirements-normalization-agent.md` |
| 4   | System test design               | `.qa-ai/agents/test-design-system-agent.md`         |
| 5   | Per-RF test design               | `.qa-ai/agents/gherkin-test-design-agent.md`        |
| 6   | Gherkin feature generation       | `.qa-ai/agents/gherkin-test-design-agent.md`        |
| 7   | Gherkin quality evaluation       | `.qa-ai/agents/gherkin-quality-agent.md`            |
| 8   | Test management coverage         | `.qa-ai/agents/test-management-coverage-agent.md`   |
| 9   | Test management sync planning    | `.qa-ai/agents/test-management-sync-agent.md`       |
| 10  | Automation feasibility           | `.qa-ai/agents/automation-feasibility-agent.md`     |
| 11  | UI/E2E and mobile implementation | `.qa-ai/agents/ui-implementation-agent.md`          |
| 12  | API/integration implementation   | `.qa-ai/agents/api-testing-agent.md`                |
| 13  | Issue task draft                 | `.qa-ai/agents/jira-task-agent.md`                  |
| 14  | PR summary                       | `.qa-ai/agents/pr-agent.md`                         |
| 15  | Release quality gate             | `.qa-ai/agents/release-gate-agent.md`               |

## Optional and parallel agents

These agents are not part of the numbered sequence. Load them on demand when their trigger applies.

| Agent                            | File                                           | When to load                                                         |
| -------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| Gherkin quality                  | `.qa-ai/agents/gherkin-quality-agent.md`       | After Gherkin generation when `testDesign.quality.mode` is not `off` |
| External requirements intake     | `.qa-ai/agents/external-intake-agent.md`       | Before normalization when `sources.external.enabled` is true         |
| Test management diff (governed)  | `.qa-ai/agents/test-management-diff-agent.md`  | Governed sync mode, after the sync plan is approved                  |
| Test management apply (governed) | `.qa-ai/agents/test-management-apply-agent.md` | Governed sync mode, after the diff is reviewed and approved          |
| Test healing                     | `.qa-ai/agents/test-healing-agent.md`          | When `automation.healing.enabled` is true and automated specs fail   |
| Test impact analysis             | `.qa-ai/agents/test-impact-agent.md`           | Change-scoped runs to select affected tests from the matrix          |
| Defect report                    | `.qa-ai/agents/defect-report-agent.md`         | After failures or exploratory findings                               |

## Specialists

Auto-activated specialists are listed in `.qa-ai/agents/specialists/active.md` (generated from `qa-ai.config.yaml`).
Available sources live under `.qa-ai/agents/specialists/available/`. On-demand specialists are also loaded from
explicit NFR attributes, RF/CA keyword signals, and project configuration — see
[specialist-routing-matrix.md](../../docs/qa-ai/specialist-routing-matrix.md) and `test-strategy-router.mjs`.

- **UI/E2E**: WebdriverIO, Playwright UI, Cypress, Selenium.
- **Mobile**: Maestro and Appium via `automation.mobile.framework`. The mobile implementation phase uses the generic
  UI implementation agent plus the active mobile specialist. Advanced mobile strategy (`permissions`, `offline`, `push notification`, `deep link`, biometrics, etc.) routes to `mobile-advanced-agent.md` by requirement signals, not by framework alone.
- **API**: Playwright API, Postman, REST Assured, Karate.
- **Test management / issue tracker**: TestRail, Jira.
- **AI system testing**: AI eval suites and authorized AI red-team design when `aiTesting.enabled: true`.
- **Cross-cutting NFR** (load on demand): `accessibility.md`, `performance.md`, `security.md`, `scalability.md`,
  `availability-reliability.md`, `usability.md`, `compatibility-portability.md`, `maintainability.md`.
- **Exploratory and test data**: `exploratory-testing-agent.md`, `test-data-agent.md`.
- **Contracts and data**: `contract-testing-agent.md`, `data-quality-agent.md`, `database-migration-agent.md`.
- **UI/product quality**: `visual-regression-agent.md`, `cross-browser-device-agent.md`, `i18n-l10n-agent.md`,
  `analytics-tracking-agent.md`.
- **Operations**: `observability-testing-agent.md`, `post-deploy-validation-agent.md`, `browserstack-strategy-agent.md`, `mobile-advanced-agent.md`.
- **Security, privacy and compliance**: `security-advanced-agent.md`, `threat-modeling-agent.md`, `privacy-testing-agent.md`,
  `compliance-testing-agent.md`.
- **Performance and resilience**: `performance-execution-agent.md`, `resilience-chaos-agent.md`.

On-demand specialists are not mandatory phases. Load them when NFR attributes, requirement/criterion signals, configured
tools or explicit user instructions apply. `generic-test-design` remains the baseline specialist.

## Usage Rule

Before starting a QA workflow phase, read the matching phase agent and any active specialists. Apply those instructions as role context for the work. Do not skip this just because the current tool cannot call subagents directly.

When generating Gherkin with `@type:accessibility` or `@type:performance`, also read the matching specialist file even if it is not listed in `active.md`.
Load `security.md` for `@type:security` scenarios or when the configured coverage policy requires a security review.
When `normalized-requirements.md` lists source NFR attributes, load the matching specialists from
`.qa-ai/agents/specialists/available/` on demand (see `NFR_ATTRIBUTE_SPECIALIST_MAP` in `project-config.mjs`) even if they
are not listed in `active.md`.
When `aiTesting.enabled: true`, load `ai-evals.md` and `ai-red-team.md` through the generated active specialists list.
