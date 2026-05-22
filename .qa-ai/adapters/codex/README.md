# Codex Adapter

Codex should use `AGENTS.md` as the primary instruction file.

Recommended opening prompt:

```text
Read AGENTS.md, qa-ai.config.yaml, docs/qa-ai/implementation-guide-for-codex.md and .qa-ai/rules/. Then implement the next pending task from docs/qa-ai/backlog.md. Present a plan before editing files.
```

Useful local commands:

```bash
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/validate-features.mjs
node .qa-ai/scripts/clean.mjs
```

Codex should treat `.qa-ai/workflows/` as the task playbook and `.qa-ai/rules/` as mandatory behavior.

Claude Code and OpenCode support project slash commands through generated adapters. Use `/qa-init` for agent-first initialization instead of the native `/init` command.
