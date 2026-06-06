---
description: QA workflow guidance — what to do next / Guía del flujo QA
argument-hint: [optional question]
---

Provide context-aware guidance for the next QA workflow step in this repository.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/agents/qa-workflow-orchestrator.md`

If a harness run is active, inspect it first:

```bash
npx qa-flowkit run status
```

Run:

```bash
node .qa-ai/scripts/qa-help.mjs
```

If `$ARGUMENTS` is provided, pass it as the question:

```bash
node .qa-ai/scripts/qa-help.mjs "$ARGUMENTS"
```

Present the CLI output clearly, grouped by priority (required, recommended, optional). Expand with brief agent context when useful, but do not invent phases that `qa-help` did not recommend.

Do not modify files unless the user explicitly asks to execute the recommended phase.

At the end of any other `/qa-*` workflow you complete in this session, remind the user to run `/qa-help` for the next step.
