---
description: Summarize QA AI repo status / Resumir estado del repo QA AI
argument-hint: [optional scope]
---

Summarize the current QA AI Starter status for this repository.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/specialists/active.md` when present

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for the summary.

If `$ARGUMENTS` is empty, inspect the whole configured QA workspace. If `$ARGUMENTS` is provided, treat it as a folder, RF ID or scope filter.

Run setup and feature validation checks when useful:

```bash
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/validate-features.mjs --allow-empty
```

Summarize:

- Configured interface and Gherkin languages.
- Requirement source, test management tool and issue tracker.
- Feature path and `.feature` counts by type/tag/manual flag.
- Automation frameworks and configured automation paths.
- Existing QA output artifacts.
- Active specialists.
- Warnings, gaps and recommended next command.

Do not modify files.
