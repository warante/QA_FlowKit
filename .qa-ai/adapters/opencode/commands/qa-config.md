---
description: Import or export QA FlowKit configuration / Importar o exportar configuracion de QA FlowKit
argument-hint: [--export path | --import path]
---

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Import or export a reusable QA FlowKit configuration profile.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` when present for user-facing questions and summaries.

If `$ARGUMENTS` is empty, ask the user:

1. Do you want to export the current config or import an existing profile?
2. What repo-local profile path should be used?
   - Recommended export path: `.qa-ai/config-profiles/team.yaml`.
3. If importing and `qa-ai.config.yaml` already exists, should it be overwritten?
   - Recommend `no`; only use `--force` if the user explicitly approves.

For export, run:

```bash
node .qa-ai/scripts/config.mjs --export <profile-path>
```

For import, run:

```bash
node .qa-ai/scripts/config.mjs --import <profile-path>
```

Only add `--force` when the user explicitly approves overwriting. Add `--no-structure` only when the user wants to import the YAML without creating configured folders or refreshing `.qa-ai/agents/specialists/active.md`.

If `$ARGUMENTS` is not empty, treat it as advanced mode and run:

```bash
node .qa-ai/scripts/config.mjs $ARGUMENTS
```

After import, run or suggest:

```bash
node .qa-ai/scripts/doctor.mjs
```

Do not write to external tools.
