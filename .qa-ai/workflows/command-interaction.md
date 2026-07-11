# Command Interaction Protocol

Apply this protocol to every QA FlowKit slash-command interaction.

## Interface language

Before emitting any user-facing text:

1. Prefer resolved settings from `node .qa-ai/scripts/show-config.mjs --json` (or `npx qa-flowkit show-config --json`). Slash commands may inject this JSON in the preamble.
2. If reading manually, load config only from `.qa-ai/qa-ai.config.yaml`. If root `qa-ai.config.yaml` exists, stop and offer explicit migration.
3. Resolve the interface language from `interfaceLanguage` in the JSON output, or from `project.interfaceLanguage` / `project.defaultLanguage` in the loaded file. Default to `en` only when no config exists (`ok: false`).
4. Use that language for the complete command interaction: questions, option labels,
   plans, approvals, progress, errors and summaries.

Use `gherkinLanguage` from the JSON output, or `gherkin.language` from the loaded config, only for `.feature` file content. Raw output from invoked scripts
may remain in the script's language, but explain and summarize it in the configured
interface language.

`/qa-init` is the exception before configuration exists: ask the first language question
in English and Spanish, then use the selected interface language for every remaining
question and response.

## Closed choices

- When the host exposes an interactive question tool, use it for every closed choice.
- Give each predefined option a numeric prefix (`1.`, `2.`, ...), a short localized
  label and the exact value that will be applied.
- Do not require the user to type or repeat the full option text.
- Accept a click, the option number, the short label or the exact value.
- Keep custom input separate from predefined options. Use the host's custom-answer
  field; when it is not provided automatically, add a final localized
  `Other / Otro (write a value)` option.
- Do not present a closed-choice question only as prose when an interactive question
  tool is available.

### Supported adapter behavior

| Adapter or host          | Closed-choice behavior                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenCode                 | Use the built-in `question` tool.                                                                                                                    |
| Gemini CLI               | Use `ask_user` with `choice` or `yesno`; split groups when the tool's option/question limits require it.                                             |
| Cline                    | Use `ask_followup_question` with predefined options.                                                                                                 |
| Codex Desktop            | Use `request_user_input` when the current mode exposes it; otherwise use the numbered fallback.                                                      |
| Claude Code              | Use its interactive question tool when available; otherwise use the numbered fallback.                                                               |
| Continue                 | Use the numbered fallback unless the active Continue host exposes an equivalent question tool.                                                       |
| Aider                    | Use the numbered fallback in chat.                                                                                                                   |
| Goose CLI/recipe         | Use the numbered fallback in an interactive session. Recipe parameters may collect known values before execution, but custom values remain separate. |
| Generic or unknown agent | Use the numbered fallback.                                                                                                                           |

## Open input

Use free text only when the value cannot be selected meaningfully, such as a file path,
an official RF ID, pasted requirement text or a custom value selected through
`Other / Otro`.

## Portable fallback

If no interactive question tool is available, show a numbered list and ask the user to
reply with the number. Include a separate `Other / Otro` number only when a custom value
is valid.
