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

Claude Code users can alternatively install the generated QA FlowKit plugin from this repository's marketplace. The plugin provides namespaced skills, hooks and the orchestrator agent, but it does not replace target-repository initialization: the repo still needs `.qa-ai/` and `qa-ai.config.yaml` from `npx qa-flowkit init`. See [Claude Code Plugin](claude-plugin.md).

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
- `/qa-enable-enterprise` enables enterprise governance on an initialized repository: explains the difference from init
  templates, warns when the current track is `quick`, asks for approval, then sets `project.qaTrack: enterprise` in
  `qa-ai.config.yaml`. Does not run `/qa-gate` automatically.
- `/qa-gate` records the release gate decision; use only when `project.qaTrack` is `enterprise`.

The framework agents under `.qa-ai/agents/` are role instructions. If a tool does not expose them as callable subagents, it must read `.qa-ai/agents/README.md`, the matching phase agent and `.qa-ai/agents/specialists/active.md` directly before doing QA workflow work. When `knowledge.enabled` is true, it must also read the configured QA knowledge summary and init decisions artifacts before planning.

## Supported adapters

Adapter support is declared in [`adapter-support.v1.json`](adapter-support.v1.json) and checked by
`npm run test:adapter-support`. The levels are:

- `template-verified`: template files are present, packaged and checked for required shared workflow guidance.
- `cli-smoke-verified`: template verification plus automated init/sync/doctor or parity checks in local CI.
- `host-e2e-verified`: CLI smoke verification plus a dated real-host run using the advertised host UI.

| Adapter       | Generated path                                                 | Support level        | Verified on | Purpose                                                                       |
| ------------- | -------------------------------------------------------------- | -------------------- | ----------- | ----------------------------------------------------------------------------- |
| Generic       | `AGENTS.md`                                                    | `cli-smoke-verified` | 2026-06-25  | Cross-agent behavior and safety policy.                                       |
| Claude Code   | `.claude/agents/`, `.claude/commands/` or the generated plugin | `cli-smoke-verified` | 2026-06-25  | Claude-specific agent, slash command and hook integration.                    |
| Codex Desktop | `.codex/README.md`, `.codex/prompts/`                          | `template-verified`  | 2026-06-25  | Codex onboarding prompts and local validation commands.                       |
| OpenCode      | `.opencode/agents/`, `.opencode/commands/`                     | `cli-smoke-verified` | 2026-06-25  | OpenCode agent and slash command documentation.                               |
| Cline         | `.clinerules`, `.cline/`                                       | `template-verified`  | 2026-06-25  | Cline behavior rules and docs.                                                |
| Continue      | `.continue/`                                                   | `template-verified`  | 2026-06-25  | Review/check documentation.                                                   |
| Aider         | `.aider.conf.yml`, `.aider/`                                   | `template-verified`  | 2026-06-25  | Aider read-list and usage notes.                                              |
| Goose         | `.goose/recipes/qa-flowkit.yaml`                               | `template-verified`  | 2026-06-25  | Reusable Goose workflow recipe.                                               |
| Gemini CLI    | `GEMINI.md`                                                    | `template-verified`  | 2026-06-25  | Gemini CLI project context that points back to the shared QA AI instructions. |

No adapter is currently advertised as `host-e2e-verified`. The retrospective pilot evidence confirms Claude Code and
OpenCode were usable in a real repository, but the 1.0 support table only upgrades an adapter to host E2E after a fresh,
dated run on the current release candidate.

## Command Metadata and Execution

Slash commands for supported adapters (such as Claude Code and OpenCode) are defined using Markdown files in `.claude/commands/` and `.opencode/commands/`. These commands support standardized frontmatter keys for access control and invocation:

- `allowed-tools`: Restricts the tools available to the agent during command execution. Read-only commands (e.g. status, help, validation) restrict tools to `[view_file, list_dir, grep_search, glob, run_command]` to prevent accidental file modifications. Modifying commands allow write/edit tools.
- `disable-model-invocation`: Set to `true` (specifically for `/qa-gate`) to prevent the AI model from initiating the command autonomously, ensuring quality gate decisions require human interaction.

### Context Injection

Where supported by the host (like Claude Code or OpenCode), commands can execute utility scripts to inject live state directly into the agent's context when a command is loaded. This is done by placing backtick-escaped bang commands at the top of the command file:

- `!`npx qa-flowkit run status --json``: Injects the current resumable workflow status.
- `!`npx qa-flowkit help --json``: Injects the workflow's next-step recommendations.

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

## Enforcement Hooks and Graceful Degradation

Some agent hosts support native interception mechanisms (hooks) to run verification steps automatically before or after tool executions, or at the end of a turn.

- **Claude Code**: Supports native `PostToolUse` and `Stop` hooks. We automatically configure these hooks in `.claude/settings.json` to trigger post-edit validation (`post-edit-validate.mjs`) and the release stop gate (`stop-gate.mjs`). This provides deterministic interception of invalid files or pending verification checks.
- **OpenCode and Hookless Hosts**: OpenCode and other hosts (e.g. Codex, Cline, Continue, Aider, Goose, Gemini CLI) do not currently support project-level settings hooks for intercepting edits or turn completion. In these environments, the system falls back to documented instructions. The agent must manually run the appropriate validation scripts (e.g., `node .qa-ai/scripts/validate-target.mjs`) after every file modification and before finalizing its work.

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
