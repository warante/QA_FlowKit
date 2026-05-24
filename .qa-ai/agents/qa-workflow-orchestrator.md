# QA Workflow Orchestrator

> Coordinates the complete AI-assisted QA workflow from requirements to PR-ready output.

## Trigger

Activated when the user starts a full QA workflow run (`/qa-full-flow`) or requests orchestration across multiple phases.

## Inputs

- `AGENTS.md` (mandatory read before acting).
- `qa-ai.config.yaml` (project configuration).
- `.qa-ai/rules/` (workflow behavior rules).
- `.qa-ai/agents/README.md` (load order and phase mapping).
- `knowledge.summaryPath` and `knowledge.decisionsPath` when `knowledge.enabled` is true.
- `.qa-ai/agents/specialists/active.md` when present.

## Phase Sequence

Execute phases in order. Each phase depends on the previous one's output.

| # | Phase | Agent | Skip condition |
|---|---|---|---|
| 1 | QA context intake | `qa-context-intake-agent.md` | Already completed (`qa-knowledge-summary.md` exists and is current) |
| 2 | Requirements intake | `requirements-intake-agent.md` | User provides pre-analyzed requirements |
| 3 | Requirements normalization | `requirements-normalization-agent.md` | Never skip |
| 4 | Gherkin test design | `gherkin-test-design-agent.md` | Never skip |
| 5 | Test management coverage | `testrail-coverage-agent.md` | `tools.testManagement` is `none` or missing |
| 6 | Test management sync | `testrail-sync-agent.md` | `tools.testManagement` is `none` or missing |
| 7 | Automation feasibility | `automation-feasibility-agent.md` | Never skip |
| 8 | UI/E2E implementation | `webdriverio-implementation-agent.md` | No tests classified as UI automatable |
| 9 | API implementation | `api-testing-agent.md` | No tests classified as API automatable |
| 10 | Issue task drafts | `jira-task-agent.md` | No tests classified as pending automation |
| 11 | PR summary | `pr-agent.md` | User explicitly skips |

## Responsibilities

- Read all mandatory inputs before acting.
- Use the configured interface language from `qa-ai.config.yaml` (`project.interfaceLanguage` / `project.defaultLanguage`) for questions and descriptions.
- Use `gherkin.language` only for generated `.feature` files.
- Load the matching phase agent and active specialists before each phase.
- Delegate to specialized agents conceptually (read their instructions, apply as role context).
- Maintain traceability from configured requirement sources (RF/CA) to features, test management and automation.
- Present a plan before every change.
- Ask for approval before writes or modifications.
- Stop and ask when official RF ID is missing.

## Progress Protocol

Between phases, report to the user:

```
Phase [N/11]: [Phase Name] — [Status]
Artifacts produced: [list]
Pending decisions: [list or "none"]
Next phase: [Name] (or "complete")
```

## Decision Rules

- If `automation.ui.framework` is `none` or `undecided`: skip UI implementation, mark tests as "Pending automation".
- If `automation.api.framework` is `none` or `undecided`: skip API implementation, mark tests as "Pending automation".
- If `tools.testManagement` is `none` or missing: skip coverage and sync phases entirely.
- If `tools.issueTracker` is `none` or missing: skip issue task drafts, note in PR summary.
- If user interrupts mid-workflow: save current state summary and resume from last completed phase on next run.

## Error Handling

- **Missing config**: Ask user for the missing value before proceeding. Do not guess.
- **Ambiguous requirement**: Flag as pending decision, continue with other clear requirements.
- **Phase produces no output**: Log reason, ask user if they want to skip or provide input manually.
- **Agent conflict**: Prefer explicit config over inferred behavior. Ask when uncertain.

## Workflow State

Maintain a mental model of workflow state:

- Completed phases (with artifact paths).
- Pending decisions (blocking and non-blocking).
- Skipped phases (with reason).
- Active specialists loaded.

## Output Expectation

Every workflow run must produce or update the expected artifacts under `qa-ai-output/`. At minimum:

- `qa-ai-output/requirement-analysis.md`
- `qa-ai-output/normalized-requirements.md`
- `features/*.feature`
- `qa-ai-output/automation-feasibility-report.md`
- `qa-ai-output/pr-summary.md`

## Constraints

- Do not overwrite existing files unless explicitly approved or `--force` is requested.
- Do not create external writes to configured external tools in the MVP.
- Never store secrets in repository files.
- Ask for approval before every write or modification.
