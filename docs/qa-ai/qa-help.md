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

Set during `init` (from preset or `--qa-track`):

| Track | Best for | Active phases |
|---|---|---|
| `quick` | Manual QA, narrow scope, Gherkin + traceability + PR | Context (optional), intake, normalization, Gherkin (proposal + features), traceability, PR |
| `standard` | Full QA AI workflow (default) | All phases when tools and frameworks are configured, including system and per-RF test design |
| `enterprise` | Teams that require strict target validation | Same as `standard`, plus `/qa-gate` and `validate-release-gate.mjs` |

### Preset defaults

| Preset | Default track |
|---|---|
| `manual-only` | `quick` |
| `webdriverio-playwright-api` | `standard` |
| `selenium-jest-browserstack` | `standard` |

Override at init:

```bash
node .qa-ai/scripts/init.mjs --preset manual-only --qa-track quick
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --qa-track enterprise
```

## How `qa-help` decides the next step

1. Reads `qa-ai.config.yaml` and `project.qaTrack`.
2. Checks which workflow artifacts and `.feature` files exist.
3. Applies track-based skips (for example, `quick` skips test-management sync and automation implementation).
4. Applies config-based skips (for example, `tools.testManagement: none`).
5. Prints prioritized recommendations: **required**, **recommended**, **optional**.

## Relationship to `/qa-status`

| Command | Purpose |
|---|---|
| `/qa-help` | What to do **next** in the workflow |
| `/qa-status` | Snapshot of **current** config, artifacts and health |

`/qa-status` includes `qa-help` output for the recommended next command.

## After each workflow step

Run `qa-help` again to confirm the next phase. The orchestrator and `/qa-full-flow` command templates remind agents to do this automatically.

## See also

- [Test design dual-mode](test-design-dual-mode.md)
- [Workflow](workflow.md)
- [Getting started](getting-started.md)
- [Agent compatibility](agent-compatibility.md)
