---
description: Add QA tests for a new RF / Anadir pruebas QA para un RF nuevo
argument-hint: [requirement source or RF ID]
allowed-tools: [view_file, write_file, edit_file, list_dir, grep_search, glob, run_command]
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
- `.qa-ai/agents/test-management-coverage-agent.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/rules/ai-testing.rules.md` when `aiTesting.enabled` is true or the RF signals AI/LLM behavior
- `.qa-ai/workflows/test-design.md`

Before asking anything, resolve `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` and keep that language for the complete interaction. Use `gherkin.language` only for generated `.feature` files.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. Use Claude Code's interactive question tool when available to select where the new requirement/RF comes from:
   - `1. Configured source` -> localize the label; use `sources.main` from config, then ask only for the source-specific identifier when needed.
   - `2. Local file` -> localize the label and ask for the path as free text.
   - `3. Pasted text` -> localize the label and ask for the requirement text as free text.
   - `4. Other` -> localize the label and ask for a custom source as free text.
2. Ask for the official RF ID as free text.
3. If `aiTesting.enabled` is true and the RF mentions model, LLM, prediction, score, generative, biometric matching,
   confidence or non-deterministic behavior, ask whether it is an AI component:
   - EN: "Does this RF involve an AI/LLM, prediction, score, generative, biometric, confidence-based or otherwise non-deterministic component?"
   - ES: "¿Este RF involucra un componente de IA/LLM, predicción, puntuación, generación, biometría, confianza u otro comportamiento no determinista?"
4. Use the interactive question tool when available for the first-pass scope:
   - `1. Proposal only` -> localize the label and stop after proposal artifacts.
   - `2. Features after approval` -> localize the label, prepare the proposal, request approval, then generate new `.feature` files.

Stop before final `.feature` generation if the official RF ID is missing.

Then present a concise plan before modifying files.

Workflow:

1. Inspect existing `.feature` files and configured automation paths to avoid duplicates.
2. Analyze the new RF and acceptance criteria.
3. Produce or update `qa-ai-output/requirement-analysis.md`.
4. Produce or update `qa-ai-output/test-design-proposal.md` with only new tests to add and existing tests to reuse. If
   the RF is an AI component, set `AI component: yes`, cover every configured `aiTesting.requiredTechniques` value in
   the `Technique` column, and prepare matching `@ai-component` / `@technique:<value>` feature tags.
5. After approval, create one `.feature` file per new test case under `gherkin.featurePath/<type-subfolder>/` (see `gherkin-test-design-agent.md` and `gherkin.rules.md` — never in the feature root).
6. Update `qa-ai-output/traceability-matrix.md` when useful.
7. Run `node .qa-ai/scripts/validate-features.mjs`, `node .qa-ai/scripts/validate-traceability.mjs` and `node .qa-ai/scripts/validate-sync-plan.mjs` after feature/artifact changes.

Do not modify existing tests unless the user explicitly approves that scope. Do not write to configured external tools.
