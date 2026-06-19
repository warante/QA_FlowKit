---
description: Summarize QA AI repo status / Resumir estado del repo QA AI
argument-hint: [optional scope]
allowed-tools: [view_file, list_dir, grep_search, glob, run_command]
---

!`npx qa-flowkit run status --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Summarize the current QA FlowKit status for this repository.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/specialists/active.md` when present

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for the summary.

If `$ARGUMENTS` is empty, inspect the whole configured QA workspace. If `$ARGUMENTS` is provided, treat it as a folder, RF ID or scope filter.

Run setup and validation checks when useful. Use `--allow-empty` only for freshly initialized repositories where artifacts do not exist yet:

```bash
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/validate-features.mjs --allow-empty
node .qa-ai/scripts/validate-traceability.mjs --allow-empty --allow-missing
node .qa-ai/scripts/validate-sync-plan.mjs --allow-empty --allow-missing
node .qa-ai/scripts/validate-active-specialists.mjs --allow-missing
```

For initialized target repositories after a real QA flow, recommend running the validators without `--allow-empty` / `--allow-missing` and add `node .qa-ai/scripts/doctor.mjs --strict` for CI hardening.

Shortcut for target repositories:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Summarize:

- Configured interface and Gherkin languages.
- `project.qaTrack` (`quick`, `standard`, or `enterprise`).
- Requirement source, test management tool and issue tracker.
- Feature path and `.feature` counts by type/tag/manual flag.
- Automation frameworks and configured automation paths.
- Existing QA output artifacts.
- Active specialists.
- Warnings, gaps and recommended next command.

For the recommended next command, run and include output from:

```bash
node .qa-ai/scripts/qa-help.mjs
```

Do not modify files.
