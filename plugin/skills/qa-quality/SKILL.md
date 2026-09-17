---
description: Evaluate Gherkin quality / Evaluar calidad Gherkin
argument-hint: [RF ID or feature path]
allowed-tools: [view_file, list_dir, grep_search, glob, run_command]
---

!`node .qa-ai/scripts/show-config.mjs --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Evaluate generated Gherkin against the semantic quality rubric without editing feature files.

Read these files first:

- `AGENTS.md`
- Resolved config from the injected `show-config --json` output when present; otherwise run `node .qa-ai/scripts/show-config.mjs --json`
- `.qa-ai/rules/README.md`
- `.qa-ai/rules/gherkin.rules.md`
- `.qa-ai/rules/gherkin-quality.rubric.md`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/gherkin-quality-agent.md`
- `.qa-ai/workflows/test-design.md`

Use `interfaceLanguage` from the resolved `show-config --json` output for user-facing questions and summaries.

If `$ARGUMENTS` is empty, evaluate the active RF when a harness run is active; otherwise evaluate the configured
feature root.

Write or update only `testDesign.quality.reportPath` (default `.qa-ai/output/gherkin-quality-report.md`) using
`.qa-ai/templates/gherkin-quality-report.template.md`.

Do not modify `.feature` files during quality evaluation. If the report finds quality issues, list proposed follow-up
changes separately and wait for an explicit user request before editing tests.

After writing the report, run:

```bash
node .qa-ai/scripts/validate-quality-report.mjs
```

If validation fails, fix only the report unless the user explicitly asks to change the feature files.
