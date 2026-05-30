# Continue Adapter

Continue is best used for review and checks in the folder-copy MVP.

Related docs: [main README](../../../README.md) | [agent compatibility](../../../docs/qa-ai/agent-compatibility.md)

When `knowledge.enabled` is true in `qa-ai.config.yaml`, review `knowledge.summaryPath` and `knowledge.decisionsPath` before applying QA checks or review guidance.

## Read First

| File                                                        | Purpose                                  |
| ----------------------------------------------------------- | ---------------------------------------- |
| `AGENTS.md`                                                 | Generic behavior and safety rules        |
| `.qa-ai/rules/README.md` + `*.rules.md`                     | Mandatory QA workflow rules (all agents) |
| `.qa-ai/adapters/continue/checks/qa-feature-conventions.md` | Feature-file review checklist            |

## Recommended Checks

| Command                                     | Purpose                                      |
| ------------------------------------------- | -------------------------------------------- |
| `node .qa-ai/scripts/config.mjs --help`     | Import/export reusable QA AI config profiles |
| `node .qa-ai/scripts/doctor.mjs`            | Check setup health                           |
| `node .qa-ai/scripts/validate-features.mjs` | Validate `.feature` files                    |
| `node .qa-ai/scripts/clean.mjs`             | Dry-run cleanup before removal suggestions   |

Do not suggest external writes in the MVP. Keep TestRail, Jira, Confluence and GitHub write actions proposal-first.
