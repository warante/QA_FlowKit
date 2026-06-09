# Codex Adapter

This adapter gives Codex a compact onboarding path for QA FlowKit repositories.

Related docs: [main README](../../../README.md) | [agent compatibility](../../../docs/qa-ai/agent-compatibility.md)

## Primary Instructions

| File                                      | Purpose                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `AGENTS.md`                               | Cross-agent rules and safety policy                                    |
| `qa-ai.config.yaml`                       | Target repository configuration                                        |
| `qa-ai-output/qa-knowledge-summary.md`    | Team QA practice summary when `knowledge.enabled` is true              |
| `qa-ai-output/qa-init-decisions.md`       | Approved context-based init decisions when `knowledge.enabled` is true |
| `.qa-ai/rules/README.md` + `*.rules.md`   | Mandatory QA workflow rules (all agents)                               |
| `.qa-ai/workflows/`                       | Phase playbooks                                                        |
| `.qa-ai/workflows/command-interaction.md` | Interface language, selectable choices and free-text fallback          |
| `.qa-ai/agents/README.md`                 | Agent loading protocol                                                 |

## Recommended Opening Prompt

```text
Read AGENTS.md, qa-ai.config.yaml, .qa-ai/workflows/command-interaction.md, docs/qa-ai/implementation-guide-for-codex.md and .qa-ai/rules/. Resolve project.interfaceLanguage before your first response. Use request_user_input for closed choices when the current mode exposes it; otherwise show numbered options with a separate Other choice. Then implement the next pending task from docs/qa-ai/backlog.md. Present a plan before editing files.

For QA workflow work, inspect mixed requirement/design inputs before normalization, write `sources.analysisPath` when
needed, load the functional security specialist when applicable and run `validate-test-coverage.mjs` when configured.
```

## Interaction

- Use `project.interfaceLanguage`, falling back to `project.defaultLanguage`, for the complete interaction.
- Use `request_user_input` for closed choices when it is available in the current Codex mode.
- When it is unavailable, present numbered options and accept the number; reserve free text for `Other`, paths, IDs and pasted content.

## Useful Commands

| Command                                                     | Purpose                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| `node .qa-ai/scripts/config.mjs --help`                     | Import/export reusable QA AI config profiles             |
| `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge` | Enable a QA context folder for agent-assisted defaults   |
| `node .qa-ai/scripts/doctor.mjs`                            | Check setup health                                       |
| `node .qa-ai/scripts/doctor.mjs --strict`                   | CI-style checks for initialized target repositories      |
| `node .qa-ai/scripts/validate-target.mjs`                   | Run the full target repository validation pipeline       |
| `node .qa-ai/scripts/validate-features.mjs`                 | Validate `.feature` files                                |
| `node .qa-ai/scripts/validate-traceability.mjs`             | Validate traceability matrix coverage and shape          |
| `node .qa-ai/scripts/validate-sync-plan.mjs`                | Validate proposal-first sync plans and mapping shape     |
| `node .qa-ai/scripts/validate-active-specialists.mjs`       | Validate active specialist index                         |
| `npm run validate:oss-extraction`                           | Run source-repo maintainer validation                    |
| `node .qa-ai/scripts/smoke-test.mjs`                        | Run core maintainer smoke checks                         |
| `node .qa-ai/scripts/clean.mjs`                             | Preview cleanup before deleting generated files          |
| `npx qa-flowkit run start`                                  | Start a resumable harness run                            |
| `npx qa-flowkit run next --json`                            | Return the active phase packet                           |
| `npx qa-flowkit run check`                                  | Validate the active phase and advance when it passes     |
| `npx qa-flowkit run retry`                                  | Reset validation attempts for a validation-blocked phase |

Claude Code and OpenCode support project slash commands through generated adapters. Use `/qa-init` for agent-first initialization instead of the native `/init` command, and `/qa-config` to import or export reusable configuration profiles.

Gemini CLI uses the generated root `GEMINI.md` context file when the `gemini` adapter is selected.
