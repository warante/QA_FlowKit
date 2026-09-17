---
description: Review and update QA tests after RF changes / Revisar y actualizar pruebas tras cambios de RF
argument-hint: [updated requirement source or RF ID]
allowed-tools: [view_file, write_file, edit_file, list_dir, grep_search, glob, run_command]
---

!`node .qa-ai/scripts/show-config.mjs --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Review existing QA tests when an RF or its acceptance criteria has changed.

Read these files first:

- `AGENTS.md`
- Resolved config from the injected `show-config --json` output when present; otherwise run `node .qa-ai/scripts/show-config.mjs --json`. `.qa-ai/qa-ai.config.yaml` is the only runtime config; migrate a detected root config before continuing.
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/gherkin-test-design-agent.md`
- `.qa-ai/agents/test-management-coverage-agent.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/rules/ai-testing.rules.md` when `aiTesting.enabled` is true or the RF signals AI/LLM behavior
- `.qa-ai/workflows/test-design.md`

Use `interfaceLanguage` and `gherkinLanguage` from the resolved `show-config --json` output for user-facing questions and summaries. Use `gherkinLanguage` only for `.feature` rules.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. Where is the updated RF source?
2. What is the official RF ID?
3. Which existing tests are in scope: all tests for that RF, a folder, or specific files?
4. If `aiTesting.enabled` is true and the RF mentions model, LLM, prediction, score, generative, biometric matching,
   confidence or non-deterministic behavior, ask whether it is an AI component:
   - EN: "Does this RF involve an AI/LLM, prediction, score, generative, biometric, confidence-based or otherwise non-deterministic component?"
   - ES: "¿Este RF involucra un componente de IA/LLM, predicción, puntuación, generación, biometría, confianza u otro comportamiento no determinista?"
5. Should this run stop at a change proposal first?
   - Recommend stopping at the proposal first.

Then present a concise plan before modifying files.

Workflow:

1. Inspect existing `.feature` files, automation tests and traceability artifacts for the RF.
2. Compare current tests with the updated RF and acceptance criteria.
3. Produce or update `.qa-ai/output/test-design-proposal.md` with explicit sections:
   - Existing tests to keep.
   - Existing tests to modify.
   - Existing tests to retire or delete.
   - New tests to add.
   - Ambiguities requiring user decision.
   - For AI components, `AI component: yes`, one planned test per configured `aiTesting.requiredTechniques` value in
     the `Technique` column, and matching `@ai-component` / `@technique:<value>` updates for generated features.
4. Ask for approval before changing, deleting or adding tests.
5. Apply only the approved changes.
6. Run `node .qa-ai/scripts/validate-features.mjs`, `node .qa-ai/scripts/validate-traceability.mjs` and `node .qa-ai/scripts/validate-sync-plan.mjs` after feature/artifact changes.
7. Update `.qa-ai/output/traceability-matrix.md` when useful.

Never delete tests by default. Do not write to configured external tools.
