# QA FlowKit - Gemini CLI Context

This repository uses QA FlowKit for repo-first QA workflows. Treat this file as the Gemini CLI entry point, then load the shared framework instructions before doing QA work.

## Required Reading

Before making changes:

- Read `AGENTS.md` when present.
- Read `qa-ai.config.yaml` when present.
- When `knowledge.enabled` is true, read `knowledge.summaryPath` and `knowledge.decisionsPath` when present.
- Read `.qa-ai/rules/README.md` and all `.qa-ai/rules/*.rules.md` files before changing workflow behavior.
- Read `.qa-ai/workflows/command-interaction.md` before the first user-facing response.
- Read `.qa-ai/agents/README.md` before QA workflow work.
- Load the matching phase agent from `.qa-ai/agents/`.
- Load `.qa-ai/agents/specialists/active.md` and the specialist files it lists when present.

## Working Rules

- Resolve `project.interfaceLanguage` / `project.defaultLanguage` before the first response and keep it for the complete interaction.
- Use Gemini CLI's `ask_user` tool for closed choices (`choice` or `yesno`). Use `text` only for paths, IDs, pasted content or a custom `Other` value.
- Number option labels and split questions when `ask_user` limits require smaller groups.
- Present a plan before modifying files.
- Do not overwrite existing files unless the user explicitly approves it or asks for `--force` behavior.
- Do not write to configured external tools in the MVP.
- Never store secrets in repository files.
- Keep all generated QA outputs open-source ready.

## Useful Commands

| Command                                                     | Purpose                                                |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `node .qa-ai/scripts/init.mjs`                              | Generate config, folders and selected adapters         |
| `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge` | Enable a QA context folder for agent-assisted defaults |
| `node .qa-ai/scripts/config.mjs --help`                     | Import/export reusable QA AI config profiles           |
| `node .qa-ai/scripts/doctor.mjs`                            | Check setup health                                     |
| `node .qa-ai/scripts/validate-features.mjs`                 | Validate `.feature` files                              |
| `node .qa-ai/scripts/clean.mjs`                             | Preview cleanup before deleting generated files        |

## QA Workflow Entry Prompt

```text
Read AGENTS.md, qa-ai.config.yaml, .qa-ai/workflows/command-interaction.md, .qa-ai/rules/README.md, all .qa-ai/rules/*.rules.md, .qa-ai/agents/README.md and .qa-ai/workflows/full-flow.md. If knowledge.enabled is true, read the configured QA knowledge artifacts first. Resolve the interface language before responding, use ask_user for closed choices, then follow the configured QA workflow, starting with a plan before editing files.
```
