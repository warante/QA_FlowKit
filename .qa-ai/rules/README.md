# QA FlowKit Rules

Mandatory behavior for **every** AI agent (Claude Code, OpenCode, Codex, Cursor, Cline, Continue, Aider, Gemini CLI, etc.) working in a repository initialized with QA FlowKit.

## How to load (all tools)

1. Read `AGENTS.md` and `qa-ai.config.yaml` when present.
2. Read **every** file in this folder matching `*.rules.md` before changing QA workflow behavior, requirements, tests, automation, or `qa-ai-output/` artifacts.
3. Read `.qa-ai/agents/README.md` and the phase agent for the current step.
4. Load specialists from `.qa-ai/agents/specialists/active.md` when present.

If your tool only accepts a short file list, include at minimum:

- `approval.rules.md`
- `workflow.rules.md`
- `requirements.rules.md`
- `gherkin.rules.md`

Then load the rest before implementation or external-tool phases.

## Recommended read order

| Order | File                                                 | Scope                                                          |
| ----: | ---------------------------------------------------- | -------------------------------------------------------------- |
|     1 | [approval.rules.md](approval.rules.md)               | Plans, approvals, secrets, MVP boundaries                      |
|     2 | [workflow.rules.md](workflow.rules.md)               | Languages, tracks, artifacts, validators                       |
|     3 | [requirements.rules.md](requirements.rules.md)       | RF/CA intake, traceability matrix                              |
|     4 | [test-design.rules.md](test-design.rules.md)         | System + per-RF design, proposal-first                         |
|     5 | [gherkin.rules.md](gherkin.rules.md)                 | `.feature` files and tags                                      |
|     6 | [test-management.rules.md](test-management.rules.md) | TestRail, Zephyr, Xray, etc. (local only in MVP)               |
|     7 | [issue-tracker.rules.md](issue-tracker.rules.md)     | Jira and similar (local drafts only in MVP)                    |
|     8 | [automation.rules.md](automation.rules.md)           | Automation principles                                          |
|     9 | [ui-automation.rules.md](ui-automation.rules.md)     | UI/E2E implementation                                          |
|    10 | [api-testing.rules.md](api-testing.rules.md)         | API/integration implementation                                 |
|    11 | [defect.rules.md](defect.rules.md)                   | Defect reports                                                 |
|    12 | [release-gate.rules.md](release-gate.rules.md)       | Enterprise release gate                                        |
|    13 | [cleanup.rules.md](cleanup.rules.md)                 | Safe cleanup of generated files                                |
|    14 | [karate.rules.md](karate.rules.md)                   | Executable Karate `.feature` files (when Karate is configured) |

## Legacy filenames

- [testrail.rules.md](testrail.rules.md) → same content as `test-management.rules.md`
- [webdriverio.rules.md](webdriverio.rules.md) → same content as `ui-automation.rules.md`

## Rules ↔ validators

Each `*.rules.md` includes an **Enforced by** line. Critical rules must map to a script (or be marked `prompt-only`).

| Rule file                                            | Validator / enforcement                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| [approval.rules.md](approval.rules.md)               | `doctor.mjs`, `validate-target.mjs` (`--scan-secrets`), `lib/secret-patterns.mjs` |
| [workflow.rules.md](workflow.rules.md)               | `doctor.mjs`, `validate-target.mjs`                                               |
| [requirements.rules.md](requirements.rules.md)       | `validate-traceability.mjs`                                                       |
| [test-design.rules.md](test-design.rules.md)         | `validate-test-design.mjs`                                                        |
| [gherkin.rules.md](gherkin.rules.md)                 | `validate-features.mjs`, `lib/gherkin-validate.mjs`                               |
| [test-management.rules.md](test-management.rules.md) | `validate-sync-plan.mjs`, `lib/test-management-mapping.mjs`                       |
| [issue-tracker.rules.md](issue-tracker.rules.md)     | prompt-only (MVP)                                                                 |
| [automation.rules.md](automation.rules.md)           | prompt-only                                                                       |
| [ui-automation.rules.md](ui-automation.rules.md)     | prompt-only                                                                       |
| [api-testing.rules.md](api-testing.rules.md)         | prompt-only                                                                       |
| [defect.rules.md](defect.rules.md)                   | prompt-only                                                                       |
| [release-gate.rules.md](release-gate.rules.md)       | `validate-release-gate.mjs`                                                       |
| [cleanup.rules.md](cleanup.rules.md)                 | `clean.mjs`                                                                       |
| [karate.rules.md](karate.rules.md)                   | `validate-karate-features.mjs` (when api/ui framework is karate)                  |

`doctor.mjs` requires every `*.rules.md` file to exist. `validate-active-specialists.mjs` enforces specialist config against `qa-ai.config.yaml`.

## Conflict resolution

- `.qa-ai/rules/` overrides team QA context summaries when they conflict.
- `qa-ai.config.yaml` overrides default paths and tool names.
- Phase agents add detail but must not contradict these rules.
