# Codex Adapter

This adapter gives Codex a compact onboarding path for QA AI Starter repositories.

Related docs: [main README](../../../README.md) | [agent compatibility](../../../docs/qa-ai/agent-compatibility.md)

## Primary Instructions

| File | Purpose |
|---|---|
| `AGENTS.md` | Cross-agent rules and safety policy |
| `qa-ai.config.yaml` | Target repository configuration |
| `.qa-ai/rules/` | Mandatory QA workflow rules |
| `.qa-ai/workflows/` | Phase playbooks |
| `.qa-ai/agents/README.md` | Agent loading protocol |

## Recommended Opening Prompt

```text
Read AGENTS.md, qa-ai.config.yaml, docs/qa-ai/implementation-guide-for-codex.md and .qa-ai/rules/. Then implement the next pending task from docs/qa-ai/backlog.md. Present a plan before editing files.
```

## Useful Commands

| Command | Purpose |
|---|---|
| `node .qa-ai/scripts/doctor.mjs` | Check setup health |
| `node .qa-ai/scripts/validate-features.mjs` | Validate `.feature` files |
| `node .qa-ai/scripts/smoke-test.mjs` | Run core maintainer smoke checks |
| `node .qa-ai/scripts/clean.mjs` | Preview cleanup before deleting generated files |

Claude Code and OpenCode support project slash commands through generated adapters. Use `/qa-init` for agent-first initialization instead of the native `/init` command.
