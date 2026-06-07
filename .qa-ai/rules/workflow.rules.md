# Workflow and Artifact Rules

**Enforced by:** doctor.mjs, validate-target.mjs

Apply to every QA workflow phase and every generated artifact.

## Languages

- Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for user-facing questions, summaries and markdown artifacts under `qa-ai-output/`.
- Use `gherkin.language` (`en` or `es`) **only** for `.feature` file content, Gherkin keywords and acceptance-criteria labels.
- Do not mix languages inside a single `.feature` file.
- Resolve the interface language before the first user-facing response and keep it for the complete command interaction.

## Command interaction

- Every slash command must read and follow `.qa-ai/workflows/command-interaction.md` before emitting user-facing text.
- Use the host's interactive question tool for closed choices when available.
- Prefix predefined options with numbers and accept a click, option number, short label or exact value.
- Keep free text for paths, IDs, pasted content and a separate `Other / Otro` custom choice.

## QA track (`project.qaTrack`)

Respect minimum artifacts per track (`quick`, `standard`, `enterprise`). When unsure, read `.qa-ai/agents/qa-workflow-orchestrator.md` § Output Expectation.

| Artifact                                        | `quick`     | `standard` | `enterprise` |
| ----------------------------------------------- | ----------- | ---------- | ------------ |
| `qa-ai-output/requirement-analysis.md`          | required    | required   | required     |
| `qa-ai-output/normalized-requirements.md`       | required    | required   | required     |
| `features/*.feature`                            | required    | required   | required     |
| `qa-ai-output/traceability-matrix.md`           | recommended | required   | required     |
| `qa-ai-output/test-design-system.md`            | skip        | required   | required     |
| `qa-ai-output/automation-feasibility-report.md` | skip        | required   | required     |
| `qa-ai-output/pr-summary.md`                    | required    | required   | required     |
| `qa-ai-output/release-gate.yaml`                | skip        | skip       | required     |

When test management or issue tracker tools are configured, produce their phase artifacts as applicable.

## Proposal-first

- Produce analysis and **proposal** artifacts before creating or rewriting production tests.
- Do not create or overwrite `.feature` files until the user approves the relevant test design proposal (unless the user explicitly requests immediate generation).
- Test management sync plans must use proposal-first language; do not claim cases were created or updated in external tools in the MVP.

## Output locations

- Workflow artifacts: `qa-ai-output/` (unless `qa-ai.config.yaml` overrides a path).
- Gherkin tests: configured `gherkin.featurePath` (usually `features/`).
- Automation code: paths from `automation.ui.*` and `automation.api.*` in config.
- Do not store secrets, tokens or private URLs in any generated file.

## Validation after changes

| Change                    | Suggested validator                            |
| ------------------------- | ---------------------------------------------- |
| `.feature` files          | `validate-features.mjs`                        |
| Traceability matrix       | `validate-traceability.mjs`                    |
| Test management sync plan | `validate-sync-plan.mjs`                       |
| Test design proposals     | `validate-test-design.mjs`                     |
| Release gate (enterprise) | `validate-release-gate.mjs`                    |
| Full target repo check    | `validate-target.mjs` or `doctor.mjs --strict` |

## Orchestration

- Follow the 14-phase sequence in `.qa-ai/agents/README.md` unless the user scopes a subset.
- Load the matching phase agent and active specialists before producing phase output.
