---
description: Release quality gate decision / Decisión de release gate
argument-hint: [optional scope or RF ID]
---

Produce or update the formal release gate for this repository.

Read first:

- `AGENTS.md`
- `qa-ai.config.yaml`
- `.qa-ai/rules/approval.rules.md`
- `.qa-ai/agents/release-gate-agent.md`
- `.qa-ai/workflows/release-gate.md`

Review QA artifacts (`qa-ai-output/pr-summary.md`, `qa-ai-output/traceability-matrix.md`, sync plan when present) and recent validator output.

If useful, run:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Present a short plan before editing `qa-ai-output/release-gate.yaml` (or the configured `release.gatePath`).

Set `decision` to one of: `PASS`, `CONCERNS`, `FAIL`, `WAIVED`. Do not leave `PENDING` for a final release without user approval.

After updating the gate file, run:

```bash
node .qa-ai/scripts/validate-release-gate.mjs
```

Then run `/qa-help` and share the result with the user.

Do not perform external writes. Ask for explicit approval before `PASS` or `WAIVED` on regulated releases.
