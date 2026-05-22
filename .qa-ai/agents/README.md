# QA AI Agent Loading Protocol

This directory contains Markdown role instructions for the QA AI workflow. Some tools expose these files as callable subagents; others only read them as project documentation. In both cases, load the relevant files before starting a workflow phase.

Related docs: [main README](../../README.md) | [workflow](../../docs/qa-ai/workflow.md) | [agent compatibility](../../docs/qa-ai/agent-compatibility.md)

## Load Order

| Order | File | Purpose |
|---|---|---|
| 1 | `.qa-ai/agents/qa-workflow-orchestrator.md` | Coordinates the full QA flow |
| 2 | `.qa-ai/agents/specialists/active.md` when present | Lists active specialists for the current config |
| 3 | Files listed in `active.md` | Adds tool/framework-specific guidance |
| 4 | Matching phase agent | Applies phase-specific rules |

## Phase Agents

| Phase | Agent File |
|---|---|
| Requirements intake | `.qa-ai/agents/requirements-intake-agent.md` |
| Requirements normalization | `.qa-ai/agents/requirements-normalization-agent.md` |
| Gherkin test design | `.qa-ai/agents/gherkin-test-design-agent.md` |
| Test management coverage | `.qa-ai/agents/testrail-coverage-agent.md` |
| Test management sync planning | `.qa-ai/agents/testrail-sync-agent.md` |
| Automation feasibility | `.qa-ai/agents/automation-feasibility-agent.md` |
| UI/E2E implementation | `.qa-ai/agents/webdriverio-implementation-agent.md` |
| API/integration implementation | `.qa-ai/agents/api-testing-agent.md` |
| Issue task draft | `.qa-ai/agents/jira-task-agent.md` |
| PR summary | `.qa-ai/agents/pr-agent.md` |

## Usage Rule

Before starting a QA workflow phase, read the matching phase agent and any active specialists. Apply those instructions as role context for the work. Do not skip this just because the current tool cannot call subagents directly.
