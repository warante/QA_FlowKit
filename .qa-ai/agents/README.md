# QA AI Agent Loading Protocol

This directory contains Markdown role instructions for the QA AI workflow. Some tools expose these files as callable subagents; others only read them as project documentation. In both cases, load the relevant files before starting a workflow phase.

Related docs: [main README](../../README.md) | [workflow](../../docs/qa-ai/workflow.md) | [agent compatibility](../../docs/qa-ai/agent-compatibility.md) | [customizing agents](../../docs/qa-ai/customizing-agents.md)

Reusable repository configuration profiles can be imported or exported with `node .qa-ai/scripts/config.mjs`; after import, reload `qa-ai.config.yaml` and `.qa-ai/agents/specialists/active.md`.

## Load Order

| Order | File                                                                                 | Purpose                                         |
| ----- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 1     | `.qa-ai/agents/qa-workflow-orchestrator.md`                                          | Coordinates the full QA flow (14 phases)        |
| 2     | `knowledge.summaryPath` / `knowledge.decisionsPath` when `knowledge.enabled` is true | Adds team QA working-practice guidance          |
| 3     | `.qa-ai/agents/specialists/active.md` when present                                   | Lists active specialists for the current config |
| 4     | Files listed in `active.md`                                                          | Adds tool/framework-specific guidance           |
| 5     | Matching phase agent                                                                 | Applies phase-specific rules                    |

## Phase Agents (orchestrator sequence)

| #   | Phase                          | Agent File                                          |
| --- | ------------------------------ | --------------------------------------------------- |
| 1   | QA context intake              | `.qa-ai/agents/qa-context-intake-agent.md`          |
| 2   | Requirements intake            | `.qa-ai/agents/requirements-intake-agent.md`        |
| 3   | Requirements normalization     | `.qa-ai/agents/requirements-normalization-agent.md` |
| 4   | System test design             | `.qa-ai/agents/test-design-system-agent.md`         |
| 5   | Per-RF test design             | `.qa-ai/agents/gherkin-test-design-agent.md`        |
| 6   | Gherkin feature generation     | `.qa-ai/agents/gherkin-test-design-agent.md`        |
| 7   | Test management coverage       | `.qa-ai/agents/testrail-coverage-agent.md`          |
| 8   | Test management sync planning  | `.qa-ai/agents/testrail-sync-agent.md`              |
| 9   | Automation feasibility         | `.qa-ai/agents/automation-feasibility-agent.md`     |
| 10  | UI/E2E implementation          | `.qa-ai/agents/webdriverio-implementation-agent.md` |
| 11  | Mobile implementation          | `.qa-ai/agents/webdriverio-implementation-agent.md` |
| 12  | API/integration implementation | `.qa-ai/agents/api-testing-agent.md`                |
| 13  | Issue task draft               | `.qa-ai/agents/jira-task-agent.md`                  |
| 14  | PR summary                     | `.qa-ai/agents/pr-agent.md`                         |
| 15  | Release quality gate           | `.qa-ai/agents/release-gate-agent.md`               |

## Optional agents

| Agent         | File                                   | When to load                           |
| ------------- | -------------------------------------- | -------------------------------------- |
| Defect report | `.qa-ai/agents/defect-report-agent.md` | After failures or exploratory findings |

## Specialists

Auto-activated specialists are listed in `.qa-ai/agents/specialists/active.md` (generated from `qa-ai.config.yaml`). Available sources live under `.qa-ai/agents/specialists/available/`.

- **UI/E2E**: WebdriverIO, Playwright UI, Cypress, Selenium.
- **Mobile**: Maestro and Appium via `automation.mobile.framework`. The mobile implementation phase uses the generic
  UI implementation agent plus the active mobile specialist.
- **API**: Playwright API, Postman, REST Assured, Karate.
- **Test management / issue tracker**: TestRail, Jira.
- **Cross-cutting** (load on demand or add to `active.md`): `accessibility.md`, `performance.md`, `security.md`.

## Usage Rule

Before starting a QA workflow phase, read the matching phase agent and any active specialists. Apply those instructions as role context for the work. Do not skip this just because the current tool cannot call subagents directly.

When generating Gherkin with `@type:accessibility` or `@type:performance`, also read the matching specialist file even if it is not listed in `active.md`.
Load `security.md` for `@type:security` scenarios or when the configured coverage policy requires a security review.
