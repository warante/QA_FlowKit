---
description: Analyze QA functional coverage / Analizar cobertura funcional QA
argument-hint: [RF ID, requirement source, or scope]
allowed-tools: [view_file, list_dir, grep_search, glob, run_command]
---

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Analyze functional QA coverage across requirements, `.feature` files, manual tests and automated tests.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/test-management-coverage-agent.md`
- `.qa-ai/agents/automation-feasibility-agent.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/workflows/automation-analysis.md`
- `.qa-ai/workflows/test-management-sync.md`

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for user-facing questions and summaries.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. What scope should be analyzed: one RF, a requirement source, a feature folder, or the whole repo?
2. Where are the requirements or acceptance criteria for that scope?
3. Should configured test management data be considered from local exports/mapping files?

Then present a concise plan before modifying files.

Run these validators before writing coverage metrics and cite their output in the report:

```bash
node .qa-ai/scripts/validate-test-design.mjs
node .qa-ai/scripts/validate-test-coverage.mjs
node .qa-ai/scripts/validate-features.mjs
node .qa-ai/scripts/validate-traceability.mjs
```

When `testDesign.quality.mode` is not `off`, also run `node .qa-ai/scripts/validate-quality-report.mjs`.

Coverage dimensions:

- Requirement/RF coverage.
- Acceptance criteria coverage.
- Manual test coverage.
- Automated test coverage.
- Gaps, duplicates, overlaps and stale tests.
- Automation candidates and blockers.

Expected local artifacts:

- `qa-ai-output/qa-coverage-report.md` with separate sections for planned coverage, created evidence, `proposal-only`
  rows, `pending-decision` criteria, functional CA metrics and RFN metrics. Do not claim 100% coverage when any validator
  fails or a planned `Action: create` feature is missing.
- `qa-ai-output/test-management-coverage-analysis.md` when test management is configured or local mapping data exists
- `qa-ai-output/traceability-matrix.md` when useful

Do not modify tests or write to external tools unless the user explicitly asks and approves a follow-up change.
