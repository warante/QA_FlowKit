# Aider Adapter

Aider should read the generic project instructions and configured QA rules before editing.

Related docs: [main README](../../../../README.md) | [agent compatibility](../../../../docs/qa-ai/agent-compatibility.md)

## Read First

| File | Purpose |
|---|---|
| `AGENTS.md` | Generic behavior and safety rules |
| `qa-ai.config.yaml` | Target repository configuration |
| `.qa-ai/rules/` | Mandatory QA workflow rules |
| `.qa-ai/workflows/` | Task playbooks |

## Commands

| Aider Command | Purpose |
|---|---|
| `/run node .qa-ai/scripts/doctor.mjs` | Check setup health |
| `/run node .qa-ai/scripts/validate-features.mjs` | Validate `.feature` files after changes |
| `/run node .qa-ai/scripts/clean.mjs` | Preview cleanup before removing generated files |

Never overwrite existing files or delete generated artifacts without explicit user approval.
