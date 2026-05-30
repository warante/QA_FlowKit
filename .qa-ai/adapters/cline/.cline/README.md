# Cline Adapter

Use `.clinerules` plus `AGENTS.md` as the primary instruction layer for Cline.

Related docs: [main README](../../../../README.md) | [agent compatibility](../../../../docs/qa-ai/agent-compatibility.md)

## Read First

| File                | Purpose                           |
| ------------------- | --------------------------------- |
| `.clinerules`       | Cline-specific behavior rules     |
| `AGENTS.md`         | Generic behavior and safety rules |
| `qa-ai.config.yaml` | Target repository configuration   |
| `.qa-ai/rules/`     | Mandatory QA workflow rules       |

## Local Checks

| Command                                     | Purpose                                      |
| ------------------------------------------- | -------------------------------------------- |
| `node .qa-ai/scripts/config.mjs --help`     | Import/export reusable QA AI config profiles |
| `node .qa-ai/scripts/doctor.mjs`            | Check setup health                           |
| `node .qa-ai/scripts/validate-features.mjs` | Validate `.feature` files                    |
| `node .qa-ai/scripts/clean.mjs`             | Preview generated artifact cleanup           |

Run cleanup as a dry-run before deleting anything, and ask for explicit approval before destructive actions.
