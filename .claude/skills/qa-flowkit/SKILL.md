---
name: qa-flowkit
description: Use QA FlowKit in an initialized repository to turn requirements into reviewed test proposals, traceability and execution evidence, or inspect QA status. Use for QA FlowKit workflow requests, not general coding or permission to release, delete files or sync external systems.
license: MIT
compatibility: Requires Node.js 22.18+ and a repository initialized with QA FlowKit.
---

# QA FlowKit

Paths below are relative to the target repository root, not this skill directory.
Do not load the entire framework or all specialists into context.

1. Read `AGENTS.md` and `.qa-ai/qa-ai.config.yaml`. Do not load a legacy root config.
2. Read `.qa-ai/workflows/command-interaction.md`; use the configured interface language.
3. Run `node .qa-ai/scripts/qa-help.mjs --json` to find the next step. For an active run,
   use `node .qa-ai/scripts/qa-run.mjs status --json` and `next --json` for its phase packet.
4. Load `.qa-ai/agents/README.md`, the active phase guidance and only its relevant rules
   and specialists. Read knowledge summaries only when enabled in config.
5. Propose scope before editing. Reuse existing tests where possible; get approval before
   modifying them. Keep official requirement IDs and evidence links. Drafts are not final tests.
6. Run the phase validators and `node .qa-ai/scripts/qa-run.mjs check` for the current run.
   Use `node .qa-ai/scripts/validate-target.mjs` before presenting finished QA work.

## Boundaries

- A well-formed report is not proof that the tests cover the intended behavior.
- Never weaken assertions or skip failures just to make a gate pass.
- Use existing runners (for example Playwright) to execute tests; FlowKit governs their evidence.
- Do not claim execution, external synchronization or release without observed evidence.
- This skill grants no approval for external writes, releases, deletion or overwriting files.
- If `.qa-ai/` is absent, explain initialization; do not install or change the repository silently.
