# Agent Compatibility

The MVP uses `AGENTS.md` as the generic compatibility layer and syncs tool-specific adapter files where useful. No adapter should become the only source of truth; every adapter points back to `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/` and `.qa-ai/workflows/`.

## Syncing adapters

Default init syncs every supported adapter:

```bash
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api
```

Adapters can also be synced explicitly:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters generic,codex,claude
node .qa-ai/scripts/sync-agent-adapters.mjs --adapter cline --adapter continue
```

Existing adapter files are skipped unless `--force` is passed.

## Agent-first initialization

Claude Code and OpenCode discover project slash commands from tool-specific folders in the repository root:

- Claude Code: `.claude/commands/`
- OpenCode: `.opencode/commands/`

Because those folders are outside the copied `.qa-ai/` framework folder, an agent-first setup needs one bootstrap step before the first agent session:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

That script copies:

```text
.claude/commands/qa-init.md
.opencode/commands/qa-init.md
```

After copying `.qa-ai/` and running the bootstrap script, start the agent and run:

```text
/qa-init
```

The command asks for the required initialization choices, then runs `node .qa-ai/scripts/init.mjs` and generates the full adapter set. Use `/qa-init`, not `/init`, because `/init` is a built-in command in both Claude Code and OpenCode.

Advanced users may still pass flags directly:

```text
/qa-init --preset webdriverio-playwright-api --adapters claude,opencode
```

Interactive command behavior:

- `/qa-init` asks for preset, adapters and overwrite behavior.
- `/qa-full-flow` asks for requirement source, official RF ID, TestRail project and whether to stop at proposals.
- `/qa-clean` previews cleanup first, then asks for scope and execution approval.
- `/qa-validate-features` uses the configured feature path unless the user asks for a custom path.
- `/qa-doctor` runs without extra input.

## Supported adapters

| Adapter | Generated path | Purpose |
|---|---|---|
| Generic | `AGENTS.md` | Cross-agent behavior and safety policy. |
| Claude Code | `.claude/agents/`, `.claude/commands/` | Claude-specific agent and slash command documentation. |
| Codex Desktop | `.codex/README.md`, `.codex/prompts/` | Codex onboarding prompts and local validation commands. |
| OpenCode | `.opencode/agents/`, `.opencode/commands/` | OpenCode agent and slash command documentation. |
| Cline | `.clinerules`, `.cline/` | Cline behavior rules and docs. |
| Continue | `.continue/` | Review/check documentation. |
| Aider | `.aider.conf.yml`, `.aider/` | Aider read-list and usage notes. |
| Goose | `.goose/recipes/qa-ai-workflow.yaml` | Reusable Goose workflow recipe. |

## Required behavior for every agent

- Read `AGENTS.md` before acting.
- Read `qa-ai.config.yaml` when present.
- Read `.qa-ai/rules/` before changing workflow behavior.
- Present a plan before modifying files.
- Do not overwrite existing files unless explicitly approved or `--force` behavior is requested.
- Do not perform external writes in the MVP.
- Run `node .qa-ai/scripts/doctor.mjs` for setup checks.
- Run `node .qa-ai/scripts/validate-features.mjs` after `.feature` changes.
- Run `node .qa-ai/scripts/clean.mjs` as a dry-run before removing generated artifacts.
- Never pass `--include-modified` to clean unless the user explicitly wants to discard edited generated files.
