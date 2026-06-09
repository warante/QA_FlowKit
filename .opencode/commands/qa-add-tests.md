---
description: Add QA tests for a new RF / Anadir pruebas QA para un RF nuevo
argument-hint: [requirement source or RF ID]
---

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Add new QA tests to a repository that may already contain `.feature` files and automation tests.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/gherkin-test-design-agent.md`
- `.qa-ai/agents/testrail-coverage-agent.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/workflows/test-design.md`

Before asking anything, resolve `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` and keep that language for the complete interaction. Use `gherkin.language` only for generated `.feature` files.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. Use OpenCode's `question` tool to select where the new requirement/RF comes from:
   - `1. Configured source` -> localize the label; use `sources.main` from config, then ask only for the source-specific identifier when needed.
   - `2. Local file` -> localize the label and ask for the path as free text.
   - `3. Pasted text` -> localize the label and ask for the requirement text as free text.
   - `4. Other` -> localize the label and ask for a custom source as free text.
2. Ask for the official RF ID as free text.
3. Use the `question` tool for the first-pass scope:
   - `1. Proposal only` -> localize the label and stop after proposal artifacts.
   - `2. Features after approval` -> localize the label, prepare the proposal, request approval, then generate new `.feature` files.

Stop before final `.feature` generation if the official RF ID is missing.

Then present a concise plan before modifying files.

Workflow:

1. Inspect existing `.feature` files and configured automation paths to avoid duplicates.
2. Analyze the new RF and acceptance criteria.
3. Produce or update `qa-ai-output/requirement-analysis.md`.
4. Produce or update `qa-ai-output/test-design-proposal.md` with only new tests to add and existing tests to reuse.
5. After approval, create one `.feature` file per new test case under `gherkin.featurePath/<type-subfolder>/` (see `gherkin-test-design-agent.md` and `gherkin.rules.md` — never in the feature root).
6. Update `qa-ai-output/traceability-matrix.md` when useful.
7. Run `node .qa-ai/scripts/validate-features.mjs`, `node .qa-ai/scripts/validate-traceability.mjs` and `node .qa-ai/scripts/validate-sync-plan.mjs` after feature/artifact changes.

Do not modify existing tests unless the user explicitly approves that scope. Do not write to configured external tools.
