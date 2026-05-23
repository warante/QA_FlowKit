# OpenCode Adapter

Use this folder as an instruction bridge for OpenCode or other terminal coding agents.

Related docs: [main README](../../../README.md) | [agent compatibility](../../../docs/qa-ai/agent-compatibility.md)

## Primary Files

| File | Purpose |
|---|---|
| `AGENTS.md` | Generic behavior and safety rules |
| `qa-ai.config.yaml` | Project configuration |
| `.qa-ai/rules/` | Mandatory workflow rules |
| `.qa-ai/agents/README.md` | Agent loading protocol |
| `.qa-ai/workflows/` | Task playbooks |

Agent files in `.qa-ai/agents/` are required role instructions for QA workflow phases. If OpenCode does not expose them as callable subagents, read the relevant Markdown files and follow them directly. Always load `.qa-ai/agents/specialists/active.md` when present, plus the specialist files it lists.

## Slash Commands

| Command | Purpose |
|---|---|
| `/qa-init` | Guided initialization |
| `/qa-config` | Import or export reusable QA AI config profiles |
| `/qa-full-flow` | End-to-end requirements-to-PR QA flow |
| `/qa-add-tests` | Add tests for a new RF without disturbing existing tests |
| `/qa-update-tests` | Review existing tests after RF changes and apply approved updates |
| `/qa-automation-plan` | Classify existing `.feature` files and plan automation |
| `/qa-coverage` | Analyze functional coverage across RFs, manual tests and automated tests |
| `/qa-status` | Summarize config, artifacts, feature health and recommended next steps |
| `/qa-doctor` | Setup health checks |
| `/qa-clean` | Manifest-based cleanup preview/execution |
| `/qa-validate-features` | Gherkin convention validation |

## Local Checks

| Command | Purpose |
|---|---|
| `node .qa-ai/scripts/config.mjs --help` | Import/export reusable QA AI config profiles |
| `node .qa-ai/scripts/doctor.mjs` | Check setup health |
| `node .qa-ai/scripts/validate-features.mjs` | Validate `.feature` files |
| `node .qa-ai/scripts/clean.mjs` | Preview cleanup before deleting generated files |

Use `.qa-ai/workflows/full-flow.md` for end-to-end QA delivery and keep all external writes proposal-first.
