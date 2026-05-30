# Release Gate Workflow

Run when `project.qaTrack` is `enterprise` or when the team needs a formal go/no-go record.

## Prerequisites

- Traceability matrix and PR summary exist.
- Target validators have been run (`validate-target.mjs` recommended).

## Steps

1. Read `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/release-gate.rules.md`, `.qa-ai/rules/approval.rules.md` and `.qa-ai/agents/release-gate-agent.md`.
2. Review validator output and QA artifacts listed in the template.
3. Produce or update `qa-ai-output/release-gate.yaml` with decision, risks and evidence paths.
4. Run `node .qa-ai/scripts/validate-release-gate.mjs`.
5. Ask the user to confirm the decision before treating it as final.
6. Run `/qa-help` to confirm there are no pending workflow phases.

## Safety

- Never set `PASS` while `validate-target.mjs` is failing unless the user explicitly accepts the risk in writing.
- `WAIVED` requires approver name and `waived_reason`.
