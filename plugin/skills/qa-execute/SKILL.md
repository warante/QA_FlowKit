---
description: Execute configured test commands and capture results / Ejecutar comandos de prueba configurados y capturar resultados
argument-hint: [execution plan path, RF ID, or test filter]
allowed-tools: [view_file, write_file, edit_file, list_dir, grep_search, glob, run_command]
---

!`node .qa-ai/scripts/show-config.mjs --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Execute configured test commands and capture structured results for analysis.

Read these files first:

- `AGENTS.md`
- Resolved config from the injected `show-config --json` output when present; otherwise run `node .qa-ai/scripts/show-config.mjs --json`. `.qa-ai/qa-ai.config.yaml` is the only runtime config; migrate a detected root config before continuing.
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/execution-agent.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/workflows/execution.md`

Use `interfaceLanguage` from the resolved `show-config --json` output for user-facing questions and summaries.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. Which tests should be executed: all configured commands, a specific RF ID, a folder, or specific test files?
2. Should this run in dry-run mode (plan only) or actually execute the tests?
   - Recommend dry-run first to review the execution plan.
3. Are there known environment, data, or credential constraints to consider?

Then present a concise plan before executing anything.

Workflow:

1. Load the execution plan from `.qa-ai/output/execution-plan.md` or create one from configured commands.
2. Map configured commands to test IDs from traceability.
3. Verify result paths are within repository boundaries.
4. Execute configured commands using the framework CLI. Never invent new commands.
5. Capture exit codes, durations, and result files.
6. Classify outcomes as `passed`, `failed`, `skipped`, `not-run`, or `blocked`.
7. Produce or update `.qa-ai/output/execution-summary.md`.
8. If failures are detected, recommend running `/qa-quality` or `/qa-gate` for analysis.

After execution, run the aggregated target-repository validator:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Do not invent shell commands, execute arbitrary code, or bypass configured timeouts and paths.
Do not write to configured external tools without approval.
