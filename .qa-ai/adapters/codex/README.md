# Codex Adapter

This adapter gives Codex a compact onboarding path for QA AI Starter repositories.

Related docs: [main README](../../../README.md) | [agent compatibility](../../../docs/qa-ai/agent-compatibility.md)

## Primary Instructions

| File | Purpose |
|---|---|
| `AGENTS.md` | Cross-agent rules and safety policy |
| `qa-ai.config.yaml` | Target repository configuration |
| `qa-ai-output/qa-knowledge-summary.md` | Team QA practice summary when `knowledge.enabled` is true |
| `qa-ai-output/qa-init-decisions.md` | Approved context-based init decisions when `knowledge.enabled` is true |
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
| `node .qa-ai/scripts/config.mjs --help` | Import/export reusable QA AI config profiles |
| `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge` | Enable a QA context folder for agent-assisted defaults |
| `node .qa-ai/scripts/doctor.mjs` | Check setup health |
| `node .qa-ai/scripts/doctor.mjs --strict` | CI-style checks for initialized target repositories |
| `node .qa-ai/scripts/validate-target.mjs` | Run the full target repository validation pipeline |
| `node .qa-ai/scripts/validate-features.mjs` | Validate `.feature` files |
| `node .qa-ai/scripts/validate-traceability.mjs` | Validate traceability matrix coverage and shape |
| `node .qa-ai/scripts/validate-sync-plan.mjs` | Validate proposal-first sync plans and mapping shape |
| `node .qa-ai/scripts/validate-active-specialists.mjs` | Validate active specialist index |
| `npm run validate:oss-extraction` | Run source-repo maintainer validation |
| `node .qa-ai/scripts/smoke-test.mjs` | Run core maintainer smoke checks |
| `node .qa-ai/scripts/clean.mjs` | Preview cleanup before deleting generated files |

Claude Code and OpenCode support project slash commands through generated adapters. Use `/qa-init` for agent-first initialization instead of the native `/init` command, and `/qa-config` to import or export reusable configuration profiles.

Gemini CLI uses the generated root `GEMINI.md` context file when the `gemini` adapter is selected.
