# QA Help and Workflow Tracks

QA FlowKit includes guided next-step recommendations inspired by [BMAD Method `bmad-help`](https://docs.bmad-method.org/reference/core-tools/). Use it when you are unsure which phase or command to run next.

## Quick commands

```bash
node .qa-ai/scripts/qa-help.mjs
npm run qa:help
```

In Claude Code or OpenCode (after adapter sync):

```text
/qa-help
/qa-help where do I start for manual QA?
```

Machine-readable output:

```bash
node .qa-ai/scripts/qa-help.mjs --json
```

## Workflow tracks (`project.qaTrack`)

Init chooses the **workflow depth** (`quick` or `standard` via preset). **Enterprise governance** is a separate
setting (`project.qaTrack: enterprise`) that adds release-gate validation on top of **standard** — enable it after init
with `/qa-enable-enterprise` in your agent (or `--qa-track enterprise` / manual config edit).

| Track / mode | When it applies                                       | Active phases                                                                                   |
| ------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `quick`      | Init with `manual-only` (or `--qa-track quick`)       | Context (optional), intake, normalization, Gherkin (proposal + features), traceability, PR      |
| `standard`   | Default automation presets and most inits             | Full workflow when tools and frameworks are configured, including system and per-RF test design |
| `enterprise` | **After init** — governance on standard, not a preset | Same phases as `standard`, plus `/qa-gate` and `validate-release-gate.mjs` in `validate-target` |

### Preset defaults (init depth only)

| Preset                       | Default `project.qaTrack` |
| ---------------------------- | ------------------------- |
| `manual-only`                | `quick`                   |
| `playwright-full`            | `standard`                |
| `maestro-karate-mobile`      | `standard`                |
| `webdriverio-playwright-api` | `standard` (legacy)       |
| `selenium-jest-browserstack` | `standard`                |
| `karate-full`                | `standard`                |

No preset sets `enterprise` by default. Use one of:

```bash
# Preferred after the repository is initialized (agent session)
/qa-enable-enterprise

# Advanced at init time
node .qa-ai/scripts/init.mjs --preset playwright-full --qa-track enterprise

# Manual
# qa-ai.config.yaml → project.qaTrack: enterprise
```

## How `qa-help` decides the next step

1. Reads `qa-ai.config.yaml` and `project.qaTrack`.
2. Checks which workflow artifacts and `.feature` files exist.
3. Applies track-based skips (for example, `quick` skips test-management sync and automation implementation).
4. Applies config-based skips (for example, `tools.testManagement: none`).
5. Prints prioritized recommendations: **required**, **recommended**, **optional**.

## Relationship to `/qa-status`

| Command      | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `/qa-help`   | What to do **next** in the workflow                  |
| `/qa-status` | Snapshot of **current** config, artifacts and health |

`/qa-status` includes `qa-help` output for the recommended next command.

## After each workflow step

Run `qa-help` again to confirm the next phase. The orchestrator and `/qa-full-flow` command templates remind agents to do this automatically.

## See also

- [Test design dual-mode](test-design-dual-mode.md)
- [Workflow](workflow.md)
- [Getting started](getting-started.md)
- [Agent compatibility](agent-compatibility.md)
