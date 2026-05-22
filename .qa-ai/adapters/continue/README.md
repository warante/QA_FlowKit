# Continue Adapter

Continue is best used for review and checks in the folder-copy MVP.

Related docs: [main README](../../../README.md) | [agent compatibility](../../../docs/qa-ai/agent-compatibility.md)

## Read First

| File | Purpose |
|---|---|
| `AGENTS.md` | Generic behavior and safety rules |
| `.qa-ai/rules/` | Mandatory QA workflow rules |
| `.qa-ai/adapters/continue/checks/qa-feature-conventions.md` | Feature-file review checklist |

## Recommended Checks

| Command | Purpose |
|---|---|
| `node .qa-ai/scripts/doctor.mjs` | Check setup health |
| `node .qa-ai/scripts/validate-features.mjs` | Validate `.feature` files |
| `node .qa-ai/scripts/clean.mjs` | Dry-run cleanup before removal suggestions |

Do not suggest external writes in the MVP. Keep TestRail, Jira, Confluence and GitHub write actions proposal-first.
