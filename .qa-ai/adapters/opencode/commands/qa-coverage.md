---
description: Analyze QA functional coverage / Analizar cobertura funcional QA
argument-hint: [RF ID, requirement source, or scope]
---

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Analyze functional QA coverage across requirements, `.feature` files, manual tests and automated tests.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/testrail-coverage-agent.md`
- `.qa-ai/agents/automation-feasibility-agent.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/workflows/automation-analysis.md`
- `.qa-ai/workflows/testrail-sync.md`

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for user-facing questions and summaries.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. What scope should be analyzed: one RF, a requirement source, a feature folder, or the whole repo?
2. Where are the requirements or acceptance criteria for that scope?
3. Should configured test management data be considered from local exports/mapping files?

Then present a concise plan before modifying files.

Coverage dimensions:

- Requirement/RF coverage.
- Acceptance criteria coverage.
- Manual test coverage.
- Automated test coverage.
- Gaps, duplicates, overlaps and stale tests.
- Automation candidates and blockers.

Expected local artifacts:

- `qa-ai-output/qa-coverage-report.md`
- `qa-ai-output/testrail-coverage-analysis.md` when test management is configured or local mapping data exists
- `qa-ai-output/traceability-matrix.md` when useful

Do not modify tests or write to external tools unless the user explicitly asks and approves a follow-up change.
