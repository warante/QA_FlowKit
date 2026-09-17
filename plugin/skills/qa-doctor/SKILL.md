---
description: Run QA FlowKit setup health checks / Ejecutar comprobaciones de QA FlowKit
argument-hint:
allowed-tools: [view_file, list_dir, grep_search, glob, run_command]
---

# /qa-doctor

!`node .qa-ai/scripts/show-config.mjs --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Run the QA FlowKit doctor script and explain the results.

Explain results in `interfaceLanguage` from the resolved `show-config --json` output (`en` or `es`; default to `en` only when `ok` is false).

For target-repository validation or post-flow hardening, recommend `/qa-status` in agent sessions (includes health checks and validator summary). For CI or terminal-only workflows, mention `npx qa-flowkit validate-target`, which runs `doctor --strict`, feature validation, traceability validation, sync-plan validation and active-specialist validation.

Command output:

!`node .qa-ai/scripts/doctor.mjs`
