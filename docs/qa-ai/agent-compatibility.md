# Agent Compatibility

The MVP uses `AGENTS.md` as the generic compatibility layer and syncs tool-specific adapter files where useful. No adapter should become the only source of truth; every adapter points back to `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/` and `.qa-ai/workflows/`.

## Syncing adapters

Default init syncs only the OpenCode adapter, keeping the first setup small:

```bash
node .qa-ai/scripts/init.mjs
```

Additional adapters can be synced explicitly:

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

The command asks for the required initialization choices, including optional QA context folder, interface language, Gherkin language, base template, requirement source, optional framework overrides and adapter selection, then runs `node .qa-ai/scripts/init.mjs`. Use `/qa-init`, not `/init`, because `/init` is a built-in command in both Claude Code and OpenCode.

Advanced users may still pass flags directly:

```text
/qa-init --preset playwright-full --interface-language es --gherkin-language en --adapters claude,opencode
/qa-init --qa-context qa-ai-knowledge --adapters claude,opencode
```

Interactive command behavior:

- Every adapter reads `.qa-ai/workflows/command-interaction.md`.
- Closed choices use the host's interactive selector when available. Every option has a number, and custom text remains a separate `Other` choice.
- After initialization, every command resolves `project.interfaceLanguage` before its first response and keeps that language for questions, plans, approvals, errors and summaries.
- `/qa-init` asks for optional QA context, interface language, Gherkin language, base template, requirement source, optional UI/API framework overrides, adapters and overwrite behavior. When QA context is provided, it reads `.qa-ai/workflows/context-intake.md` and proposes defaults before running init.
- `/qa-config` imports or exports reusable `qa-ai.config.yaml` profiles and asks for overwrite approval before using `--force`.
- `/qa-full-flow` asks for requirement source, official RF ID, configured test management project/suite and whether to stop at proposals.
- `/qa-add-tests` asks for the new requirement/RF source, official RF ID and whether to stop at proposal artifacts before adding new `.feature` files.
- `/qa-update-tests` asks for the updated RF source, official RF ID, existing test scope and proposal/apply mode before changing current tests.
- `/qa-automation-plan` asks which existing tests to analyze and produces automation feasibility plus implementation planning before any automation code is written.
- `/qa-coverage` asks for RF, requirement source or repo scope and reports functional coverage across requirements, manual tests and automated tests.
- `/qa-help` inspects artifacts and `project.qaTrack` to recommend the next workflow phase (CLI: `node .qa-ai/scripts/qa-help.mjs`).
- `/qa-status` summarizes configuration, feature health, QA artifacts, active specialists and recommended next steps without modifying files. It should include output from `qa-help` for the next command.
- `/qa-clean` previews cleanup first, then asks for scope and execution approval.
- `/qa-validate-features` uses the configured feature path unless the user asks for a custom path.
- `/qa-doctor` runs without extra input.

The framework agents under `.qa-ai/agents/` are role instructions. If a tool does not expose them as callable subagents, it must read `.qa-ai/agents/README.md`, the matching phase agent and `.qa-ai/agents/specialists/active.md` directly before doing QA workflow work. When `knowledge.enabled` is true, it must also read the configured QA knowledge summary and init decisions artifacts before planning.

## Supported adapters

| Adapter       | Generated path                             | Purpose                                                                       |
| ------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Generic       | `AGENTS.md`                                | Cross-agent behavior and safety policy.                                       |
| Claude Code   | `.claude/agents/`, `.claude/commands/`     | Claude-specific agent and slash command documentation.                        |
| Codex Desktop | `.codex/README.md`, `.codex/prompts/`      | Codex onboarding prompts and local validation commands.                       |
| OpenCode      | `.opencode/agents/`, `.opencode/commands/` | OpenCode agent and slash command documentation.                               |
| Cline         | `.clinerules`, `.cline/`                   | Cline behavior rules and docs.                                                |
| Continue      | `.continue/`                               | Review/check documentation.                                                   |
| Aider         | `.aider.conf.yml`, `.aider/`               | Aider read-list and usage notes.                                              |
| Goose         | `.goose/recipes/qa-flowkit.yaml`           | Reusable Goose workflow recipe.                                               |
| Gemini CLI    | `GEMINI.md`                                | Gemini CLI project context that points back to the shared QA AI instructions. |

## Interaction capabilities

| Adapter       | Preferred closed-choice UI                                                                                    | Portable fallback                              |
| ------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Generic       | Host-provided question tool when one exists                                                                   | Numbered options in chat                       |
| Claude Code   | Interactive question tool when available                                                                      | Numbered options in chat                       |
| Codex Desktop | `request_user_input` when exposed by the current mode                                                         | Numbered options in chat                       |
| OpenCode      | Built-in `question` tool                                                                                      | Numbered options in chat                       |
| Cline         | `ask_followup_question` with options                                                                          | Numbered options in chat                       |
| Continue      | Host-provided question tool when one exists                                                                   | Numbered options in chat                       |
| Aider         | None required by the adapter                                                                                  | Numbered options in chat                       |
| Goose         | Recipe parameters for values known before execution; interactive UI when supplied by the host or an extension | Numbered options in an interactive CLI session |
| Gemini CLI    | `ask_user` using `choice` or `yesno`                                                                          | Numbered options in chat                       |

Native UI availability can vary by host version, mode or installed extension. QA FlowKit never requires a native selector: the numbered fallback is part of the contract. Free text is reserved for `Other`, paths, official RF IDs and pasted requirement content.

Host references:

- [OpenCode question tool](https://opencode.ai/docs/tools#question)
- [Gemini CLI ask_user tool](https://geminicli.com/docs/tools/ask-user/)
- [Cline workflow questions](https://docs.cline.bot/features/slash-commands/workflows/quickstart)
- [Aider in-chat commands](https://aider.chat/docs/usage/commands.html)
- [Goose CLI interactive sessions](https://block.github.io/goose/docs/guides/goose-cli-commands)

## Required behavior for every agent

- Read `AGENTS.md` before acting.
- Read `qa-ai.config.yaml` when present.
- Read `.qa-ai/workflows/command-interaction.md` before the first user-facing response.
- Resolve `project.interfaceLanguage` / `project.defaultLanguage` once and keep it for the complete interaction.
- Use selectable predefined options when the host supports them; otherwise use numbered options with a separate custom choice.
- Read configured QA knowledge artifacts when `knowledge.enabled` is true.
- Read `.qa-ai/rules/README.md` and every `.qa-ai/rules/*.rules.md` file before changing workflow behavior (minimum: `approval`, `workflow`, `requirements`, `gherkin`).
- Present a plan before modifying files.
- Do not overwrite existing files unless explicitly approved or `--force` behavior is requested.
- Do not perform external writes in the MVP.
- Run `node .qa-ai/scripts/doctor.mjs` for setup checks.
- Run `node .qa-ai/scripts/validate-features.mjs` after `.feature` changes.
- Run `node .qa-ai/scripts/clean.mjs` as a dry-run before removing generated artifacts.
- Never pass `--include-modified` to clean unless the user explicitly wants to discard edited generated files.
