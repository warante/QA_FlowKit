---
description: Review and update QA tests after RF changes / Revisar y actualizar pruebas tras cambios de RF
argument-hint: [updated requirement source or RF ID]
---

Review existing QA tests when an RF or its acceptance criteria has changed.

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

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for user-facing questions and summaries. Use `gherkin.language` only for `.feature` rules.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. Where is the updated RF source?
2. What is the official RF ID?
3. Which existing tests are in scope: all tests for that RF, a folder, or specific files?
4. Should this run stop at a change proposal first?
   - Recommend stopping at the proposal first.

Then present a concise plan before modifying files.

Workflow:

1. Inspect existing `.feature` files, automation tests and traceability artifacts for the RF.
2. Compare current tests with the updated RF and acceptance criteria.
3. Produce or update `qa-ai-output/test-design-proposal.md` with explicit sections:
   - Existing tests to keep.
   - Existing tests to modify.
   - Existing tests to retire or delete.
   - New tests to add.
   - Ambiguities requiring user decision.
4. Ask for approval before changing, deleting or adding tests.
5. Apply only the approved changes.
6. Run `node .qa-ai/scripts/validate-features.mjs` after feature changes.
7. Update `qa-ai-output/traceability-matrix.md` when useful.

Never delete tests by default. Do not write to configured external tools.
