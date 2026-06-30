---
description: Release quality gate decision / Decisión de release gate
argument-hint: [optional scope or RF ID]
allowed-tools: [view_file, write_file, edit_file, list_dir, grep_search, glob, run_command]
disable-model-invocation: true
---

!`npx qa-flowkit run status --json`
!`node .qa-ai/scripts/show-config.mjs --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Produce or update the formal release gate for this repository.

Read first:

- `AGENTS.md`
- Resolved config from the injected `show-config --json` output (`configPath`, `qaTrack`, `aiTestingEnabled`, etc.)
- `.qa-ai/rules/release-gate.rules.md`
- `.qa-ai/rules/approval.rules.md`
- `.qa-ai/agents/release-gate-agent.md`
- `.qa-ai/workflows/release-gate.md`

Review QA artifacts (`qa-ai-output/pr-summary.md`, `qa-ai-output/traceability-matrix.md`, sync plan when present), recent validator output, execution evidence results and AI eval evidence results (when configured).

If useful, run:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Present a short plan before editing `qa-ai-output/release-gate.yaml` (or the configured `release.gatePath`).

Set `decision` to one of: `PASS`, `CONCERNS`, `FAIL`, `WAIVED`. Note that PASS requires execution evidence validation to pass for enterprise tracks when `execution.resultsPaths` is non-empty, and eval evidence validation to pass for AI-component RFs when `aiTesting.enabled` is true. Add AI eval JSON paths under `evidence.evals` when relevant. Do not leave `PENDING` for a final release without user approval.

After updating the gate file, run:

```bash
node .qa-ai/scripts/validate-release-gate.mjs
```

Then run `/qa-help` and share the result with the user.

Do not perform external writes. Ask for explicit approval before `PASS` or `WAIVED` on regulated releases.
