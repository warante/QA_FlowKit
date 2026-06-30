---
description: Propose affected tests from diff / Proponer pruebas afectadas por cambios
argument-hint: [change reference / branch / commit / PR]
allowed-tools: [view_file, list_dir, grep_search, glob, run_command]
---

!`node .qa-ai/scripts/show-config.mjs --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Analyze code changes to determine the set of impacted test cases.

Read these files first:

- `AGENTS.md`
- Resolved config from the injected `show-config --json` output when present; otherwise run `node .qa-ai/scripts/show-config.mjs --json`
- `.qa-ai/rules/README.md`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/test-impact-agent.md`

Use `interfaceLanguage` from the resolved `show-config --json` output for user-facing questions and summaries.

Analyze git diffs, PR descriptions, or branch differences to identify changed areas. Map them back to the traceability matrix (`qa-ai-output/traceability-matrix.md`) to determine affected RFs and Test IDs.

Write or update only `qa-ai-output/test-impact-analysis.md` using `.qa-ai/templates/test-impact-analysis.template.md`.

Be conservative and include rather than exclude tests when uncertain. Ensure all test cases linked to any affected RF in the matrix are selected (Superset Rule).

After writing the report, run:

```bash
node .qa-ai/scripts/validate-test-impact.mjs
```
