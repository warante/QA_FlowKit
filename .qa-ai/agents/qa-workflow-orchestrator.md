# QA Workflow Orchestrator

> Load `.qa-ai/rules/README.md` and phase-relevant `*.rules.md` before acting.

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

## QA tracks (`project.qaTrack`)

Read `project.qaTrack` from `qa-ai.config.yaml` (`quick`, `standard`, or `enterprise`). After each phase, recommend `node .qa-ai/scripts/qa-help.mjs` or `/qa-help`.

| Track        | Purpose                                              | Phases omitted (in addition to config-based skips below)                                                            |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `quick`      | Manual QA, bugfix scope, Gherkin + traceability + PR | System test design, test-management coverage/sync, automation feasibility, UI/API implementation, issue task drafts |
| `standard`   | Full QA workflow (default)                           | None                                                                                                                |
| `enterprise` | Compliance-oriented teams                            | None; after workflow completion require `validate-target.mjs`                                                       |

## Phase Sequence

Execute phases in order. Each phase depends on the previous one's output.

| #   | Phase                      | Agent                                 | Skip condition                                                                                       |
| --- | -------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | QA context intake          | `qa-context-intake-agent.md`          | `knowledge.enabled` is false, or already completed (`qa-knowledge-summary.md` exists and is current) |
| 2   | Requirements intake        | `requirements-intake-agent.md`        | User provides pre-analyzed requirements                                                              |
| 3   | Requirements normalization | `requirements-normalization-agent.md` | Never skip                                                                                           |
| 4   | System test design         | `test-design-system-agent.md`         | `quick` track                                                                                        |
| 5   | Per-RF test design         | `gherkin-test-design-agent.md`        | Never skip (proposal); on `quick` may combine with phase 6                                           |
| 6   | Gherkin feature generation | `gherkin-test-design-agent.md`        | Never skip                                                                                           |
| 7   | Gherkin quality evaluation | `gherkin-quality-agent.md`            | `quick` track, or `testDesign.quality.mode` is `off`                                                 |
| 8   | Test management coverage   | `test-management-coverage-agent.md`   | `quick` track, or `tools.testManagement` is `none` or missing                                        |
| 9   | Test management sync       | `test-management-sync-agent.md`       | `quick` track, or `tools.testManagement` is `none` or missing                                        |
| 10  | Automation feasibility     | `automation-feasibility-agent.md`     | `quick` track                                                                                        |
| 11  | UI/E2E implementation      | `webdriverio-implementation-agent.md` | `quick` track, no UI automatable tests, or `automation.ui.framework` is `none`/`undecided`           |
| 12  | API implementation         | `api-testing-agent.md`                | `quick` track, no API automatable tests, or `automation.api.framework` is `none`/`undecided`         |
| 13  | Issue task drafts          | `jira-task-agent.md`                  | `quick` track, no pending automation tests, or `tools.issueTracker` is `none`/missing                |
| 14  | PR summary                 | `pr-agent.md`                         | User explicitly skips                                                                                |
| 15  | Release quality gate       | `release-gate-agent.md`               | `project.qaTrack` is not `enterprise`                                                                |

## Responsibilities

- Read all mandatory inputs before acting.
- Before the first user-facing response, resolve the configured interface language from `qa-ai.config.yaml` (`project.interfaceLanguage` / `project.defaultLanguage`) and use it for the complete interaction.
- Use `gherkin.language` only for generated `.feature` files.
- Follow `.qa-ai/workflows/command-interaction.md` for interactive choices and free-text input.
- Load the matching phase agent and active specialists before each phase.
- Delegate to specialized agents conceptually (read their instructions, apply as role context).
- Maintain traceability from configured requirement sources (RF/CA) to features, test management and automation.
- When mixed sources are supplied, keep requirements authoritative and record source extraction, contradictions and
  limitations in `sources.analysisPath`.
- Apply `testDesign.coverage` after per-RF design and Gherkin generation. Advisory findings are reported; strict
  findings block completion.
- Apply `testDesign.quality` after Gherkin generation when enabled. Advisory findings are reported; gate findings block
  completion.
- Present a plan before every change.
- Ask for approval before writes or modifications.
- Stop and ask when official RF ID is missing.

## Progress Protocol

Between phases, report to the user:

```
Phase [N/15]: [Phase Name] — [Status]
Artifacts produced: [list]
Pending decisions: [list or "none"]
Next phase: [Name] (or "complete")
```

## Decision Rules

- If `project.qaTrack` is `quick`: skip phases 4 and 7–13 unless the user explicitly requests a deeper pass; still produce per-RF proposal (optional), features, traceability and PR summary.
- If `project.qaTrack` is `enterprise`: run phase 15 (`release-gate-agent.md`) after PR summary, then `node .qa-ai/scripts/validate-target.mjs` and `node .qa-ai/scripts/validate-release-gate.mjs`.
- If `automation.ui.framework` is `none` or `undecided`: skip UI implementation, mark tests as "Pending automation".
- If `automation.api.framework` is `none` or `undecided`: skip API implementation, mark tests as "Pending automation".
- If `tools.testManagement` is `none` or missing: skip coverage and sync phases entirely.
- If `tools.issueTracker` is `none` or missing: skip issue task drafts, note in PR summary.
- If user interrupts mid-workflow: save current state summary and resume from last completed phase on next run; run `/qa-help` to see the next required phase.

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

Every workflow run must produce or update artifacts under `qa-ai-output/` and `features/`. Minimum by track:

| Artifact                                        | `quick`                     | `standard`                  | `enterprise`                |
| ----------------------------------------------- | --------------------------- | --------------------------- | --------------------------- |
| `qa-ai-output/requirement-analysis.md`          | yes                         | yes                         | yes                         |
| `qa-ai-output/source-analysis.md`               | when mixed sources are used | when mixed sources are used | when mixed sources are used |
| `qa-ai-output/normalized-requirements.md`       | yes                         | yes                         | yes                         |
| `features/*.feature`                            | yes                         | yes                         | yes                         |
| `qa-ai-output/gherkin-quality-report.md`        | no                          | when configured             | when configured             |
| `qa-ai-output/traceability-matrix.md`           | recommended                 | yes                         | yes                         |
| `qa-ai-output/test-design-system.md`            | no                          | yes                         | yes                         |
| `qa-ai-output/automation-feasibility-report.md` | no                          | yes                         | yes                         |
| `qa-ai-output/pr-summary.md`                    | yes                         | yes                         | yes                         |
| `qa-ai-output/release-gate.yaml`                | no                          | no                          | yes                         |

When test management or issue tracker tools are configured, include their phase artifacts (`test-management-coverage-analysis.md`, `test-management-sync-plan.md`, `jira-automation-task.md`) as applicable.

## Constraints

- Do not overwrite existing files unless explicitly approved or `--force` is requested.
- Do not create external writes to configured external tools in the MVP.
- Never store secrets in repository files.
- Ask for approval before every write or modification.
