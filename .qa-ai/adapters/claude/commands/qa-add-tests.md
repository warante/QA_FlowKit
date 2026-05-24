---
description: Add QA tests for a new RF / Anadir pruebas QA para un RF nuevo
argument-hint: [requirement source or RF ID]
---

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

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for user-facing questions and summaries. Use `gherkin.language` only for generated `.feature` files.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. Where is the new requirement/RF source?
2. What is the official RF ID?
3. Should the first pass produce only proposal artifacts, or create new `.feature` files after approval?

Stop before final `.feature` generation if the official RF ID is missing.

Then present a concise plan before modifying files.

Workflow:

1. Inspect existing `.feature` files and configured automation paths to avoid duplicates.
2. Analyze the new RF and acceptance criteria.
3. Produce or update `qa-ai-output/requirement-analysis.md`.
4. Produce or update `qa-ai-output/test-design-proposal.md` with only new tests to add and existing tests to reuse.
5. After approval, create one `.feature` file per new test case under the configured `gherkin.featurePath`.
6. Update `qa-ai-output/traceability-matrix.md` when useful.
7. Run `node .qa-ai/scripts/validate-features.mjs` after feature changes.

Do not modify existing tests unless the user explicitly approves that scope. Do not write to configured external tools.
