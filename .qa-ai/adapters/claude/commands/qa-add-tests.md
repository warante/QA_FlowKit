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
- `.qa-ai/agents/requirements-normalization-agent.md`
- `.qa-ai/agents/gherkin-test-design-agent.md`
- `.qa-ai/agents/test-management-coverage-agent.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/rules/ai-testing.rules.md` when `aiTesting.enabled` is true or the RF signals AI/LLM behavior
- `.qa-ai/workflows/test-design.md`

After normalizing requirements, load on-demand specialists for detected source NFR attributes from
`.qa-ai/agents/specialists/available/` (`security`, `performance`, `accessibility`, …). Do not modify
`specialists/active.md` during this command.

On `standard` and `enterprise` tracks, also read `.qa-ai/agents/test-design-system-agent.md` and produce or update
`qa-ai-output/test-design-system.md` before the per-RF proposal. On `quick`, perform a reduced NFR analysis and note
that system test design was omitted unless the user requests it.

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
2. Analyze the new RF and acceptance criteria; produce or update `qa-ai-output/requirement-analysis.md`.
3. Normalize functional criteria and explicit source NFRs into `qa-ai-output/normalized-requirements.md` (canonical NFR
   table and atomic `Criterion ID` inventory). Ask open questions when a measurable threshold, environment or success
   criterion is missing but required. Block feature generation for criteria with `Status: pending-decision` until the
   user resolves the ambiguity.
4. Detect NFR attributes from the normalized table and load matching specialists before design.
5. On `standard` / `enterprise`, produce or update `qa-ai-output/test-design-system.md` with applicable NFR focus.
6. Produce or update `qa-ai-output/test-design-proposal.md` with functional tests using `Criterion IDs`, `Evidence type`,
   `Artifact path` and `Action` columns plus a `## Non-functional coverage` row per source NFR. Do not mark source NFRs
   as `not configured`; use applicable evidence types or justified `not-applicable` / `residual-risk`.
7. Request approval before writing new `.feature` files or other approved evidence artifacts.
8. After approval, create only approved artifacts (one `.feature` per test case when Gherkin is the chosen evidence).
9. Update `qa-ai-output/traceability-matrix.md` when useful. Use `Automation Status: proposal-only` for deferred tests.
10. Run `node .qa-ai/scripts/validate-test-design.mjs`, `node .qa-ai/scripts/validate-features.mjs`,
    `node .qa-ai/scripts/validate-test-coverage.mjs`, `node .qa-ai/scripts/validate-traceability.mjs` and
    `node .qa-ai/scripts/validate-sync-plan.mjs` after changes. When `testDesign.quality.mode` is not `off`, also run
    `node .qa-ai/scripts/validate-quality-report.mjs` after loading the Gherkin quality agent with normalized requirements,
    proposal and generated features.
11. In **Proposal only** mode, do not claim complete coverage or write final feature paths in the matrix; keep deferred
    rows as `proposal-only` and list pending decisions explicitly in the summary.

Do not modify existing tests unless the user explicitly approves that scope. Do not write to configured external tools.
