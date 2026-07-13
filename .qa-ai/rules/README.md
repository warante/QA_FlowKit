# QA FlowKit Rules

Mandatory behavior for **every** AI agent (Claude Code, OpenCode, Codex, Cursor, Cline, Continue, Aider, Gemini CLI, etc.) working in a repository initialized with QA FlowKit.

## How to load (all tools)

1. Read `AGENTS.md` and `.qa-ai/qa-ai.config.yaml` when present.
2. Read **every** file in this folder matching `*.rules.md` before changing QA workflow behavior, requirements, tests, automation, or `.qa-ai/output/` artifacts.
3. Read `.qa-ai/agents/README.md` and the phase agent for the current step.
4. Load specialists from `.qa-ai/agents/specialists/active.md` when present.
5. Before loading any specialist, read `specialist-common.rules.md`.

If your tool only accepts a short file list, include at minimum:

- `approval.rules.md`
- `workflow.rules.md`
- `untrusted-content.rules.md`
- `requirements.rules.md`
- `gherkin.rules.md`

Then load the rest before implementation or external-tool phases.

## Recommended read order

| Order | File                                                     | Scope                                                                                 |
| ----: | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
|     1 | [approval.rules.md](approval.rules.md)                   | Plans, approvals, secrets, MVP boundaries                                             |
|     2 | [specialist-common.rules.md](specialist-common.rules.md) | Shared language, traceability, output and safety contract for specialists             |
|     3 | [workflow.rules.md](workflow.rules.md)                   | Languages, tracks, artifacts, validators                                              |
|     3 | [untrusted-content.rules.md](untrusted-content.rules.md) | Requirement/context prompt-injection handling                                         |
|     4 | [requirements.rules.md](requirements.rules.md)           | RF/CA intake, normalized NFR table, traceability matrix                               |
|     5 | [test-design.rules.md](test-design.rules.md)             | System + per-RF design, `## Non-functional coverage`, proposal-first                  |
|     6 | [gherkin.rules.md](gherkin.rules.md)                     | `.feature` files and tags                                                             |
|     7 | [ai-testing.rules.md](ai-testing.rules.md)               | AI/ML component classification and 7 test techniques (when `aiTesting.enabled: true`) |
|     8 | [test-management.rules.md](test-management.rules.md)     | TestRail, Zephyr, Xray, etc. (local only in MVP)                                      |
|     9 | [issue-tracker.rules.md](issue-tracker.rules.md)         | Jira and similar (local drafts only in MVP)                                           |
|    10 | [automation.rules.md](automation.rules.md)               | Automation principles                                                                 |
|    11 | [ui-automation.rules.md](ui-automation.rules.md)         | UI/E2E implementation                                                                 |
|    12 | [mobile-automation.rules.md](mobile-automation.rules.md) | Mobile automation implementation                                                      |
|    13 | [api-testing.rules.md](api-testing.rules.md)             | API/integration implementation                                                        |
|    14 | [defect.rules.md](defect.rules.md)                       | Defect reports                                                                        |
|    15 | [release-gate.rules.md](release-gate.rules.md)           | Enterprise release gate                                                               |
|    16 | [cleanup.rules.md](cleanup.rules.md)                     | Safe cleanup of generated files                                                       |
|    17 | [karate.rules.md](karate.rules.md)                       | Executable Karate `.feature` files (when Karate is configured)                        |

## Rules ↔ validators

Each `*.rules.md` includes an **Enforced by** line. Critical rules must map to a script (or be marked `prompt-only`).

| Rule file                                                | Validator / enforcement                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [approval.rules.md](approval.rules.md)                   | `doctor.mjs`, `validate-target.mjs` (`--scan-secrets`), `lib/secret-patterns.mjs`                                        |
| [workflow.rules.md](workflow.rules.md)                   | `doctor.mjs`, `validate-target.mjs`                                                                                      |
| [untrusted-content.rules.md](untrusted-content.rules.md) | `validate-untrusted-content.mjs`, `lib/injection-patterns.mjs`                                                           |
| [requirements.rules.md](requirements.rules.md)           | `validate-traceability.mjs`, `validate-test-coverage.mjs` (source NFR rows)                                              |
| [test-design.rules.md](test-design.rules.md)             | `validate-test-design.mjs`                                                                                               |
| [test-design.rules.md](test-design.rules.md)             | `validate-test-coverage.mjs` for configured cross-feature obligations and `## Non-functional coverage`                   |
| Specialist routing matrix                                | [specialist-routing-matrix.md](../../docs/qa-ai/specialist-routing-matrix.md) (agent-guided; `test-strategy-router.mjs`) |
| [gherkin.rules.md](gherkin.rules.md)                     | `validate-features.mjs`, `lib/gherkin-validate.mjs`                                                                      |
| [ai-testing.rules.md](ai-testing.rules.md)               | `validate-features.mjs` (`@ai-component`/`@technique` tags), `validate-test-design.mjs` (AI coverage)                    |
| [test-management.rules.md](test-management.rules.md)     | `validate-sync-plan.mjs`, `validate-sync-diff.mjs`, `validate-sync-result.mjs`, `lib/test-management-mapping.mjs`        |
| [issue-tracker.rules.md](issue-tracker.rules.md)         | prompt-only (MVP)                                                                                                        |
| [automation.rules.md](automation.rules.md)               | prompt-only                                                                                                              |
| [ui-automation.rules.md](ui-automation.rules.md)         | prompt-only                                                                                                              |
| [mobile-automation.rules.md](mobile-automation.rules.md) | `doctor.mjs` for paths; `validate-maestro-flows.mjs` for Maestro flows; implementation is prompt-guided                  |
| [api-testing.rules.md](api-testing.rules.md)             | prompt-only                                                                                                              |
| [defect.rules.md](defect.rules.md)                       | prompt-only                                                                                                              |
| [release-gate.rules.md](release-gate.rules.md)           | `validate-release-gate.mjs`                                                                                              |
| [cleanup.rules.md](cleanup.rules.md)                     | `clean.mjs`                                                                                                              |
| [karate.rules.md](karate.rules.md)                       | `validate-karate-features.mjs` (when api/ui framework is karate)                                                         |

`doctor.mjs` requires every `*.rules.md` file to exist. `validate-active-specialists.mjs` enforces specialist config against `.qa-ai/qa-ai.config.yaml`.

### Additional validators (config, governed execution, framework integrity)

These validators are part of the framework but are not tied to a single `*.rules.md` contract. Most run through
`validate-target.mjs` or the CLI. `gherkin-quality.rubric.md` is **agent-enforced** (the Gherkin quality agent applies
it) and additionally checked structurally by `validate-quality-report.mjs`.

| Validator                         | Enforces / validates                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `validate-config.mjs`             | `.qa-ai/qa-ai.config.yaml` against `contracts/config.v1.schema.json`                                               |
| `validate-workflow-contract.mjs`  | `contracts/workflow.v1.json` integrity (phase IDs, paths, validator allowlist)                                     |
| `validate-active-specialists.mjs` | `agents/specialists/active.md` against configured specialists                                                      |
| `validate-quality-report.mjs`     | `gherkin-quality-report.md` structure against `gherkin-quality.rubric.md`                                          |
| `validate-external-intake.mjs`    | `imported-requirements.md` / `imported-cases.md` (IDs, timestamps, injection scan)                                 |
| `validate-maestro-flows.mjs`      | Maestro flow YAML under `automation.mobile.flowsPath`                                                              |
| `validate-sync-diff.mjs`          | Governed sync diff vs approved plan and remote snapshot                                                            |
| `validate-sync-result.mjs`        | Governed apply log vs diff, rollback and mapping                                                                   |
| `validate-execution-evidence.mjs` | Execution/eval evidence per RF (used by `validate-release-gate.mjs`)                                               |
| `validate-agent-guidance.mjs`     | `agent-guidance.v1.json` integrity: inventory, categories, config keys, phase IDs, permissions, Markdown semantics |
| `validate-agent-guidance.mjs`     | `agent-guidance.v1.schema.json` identity/shape plus canonical-source identity, existence and path safety           |
| `validate-healing-log.mjs`        | `healing-log.md` (repair types, justification, allowed spec roots)                                                 |
| `validate-test-impact.mjs`        | `test-impact-analysis.md` (impacted areas, superset of selected Test IDs)                                          |

## Conflict resolution

- `.qa-ai/rules/` overrides team QA context summaries when they conflict.
- `.qa-ai/qa-ai.config.yaml` overrides default paths and tool names.
- Phase agents add detail but must not contradict these rules.
