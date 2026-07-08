# Defect Triage Workflow

Run after result analysis when failures are classified. Skipped on quick track.

## Prerequisites

- `.qa-ai/output/result-analysis.md` exists.
- `qa-ai.config.yaml` has `analysis.defectTriagePath` configured.

## Steps

1. Read `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/defect.rules.md` and `.qa-ai/agents/defect-triage-agent.md`.
2. Read the result analysis artifact.
3. For each classified failure:
   - Create a proposed action with type, severity and description.
   - Link back to RF and test IDs.
   - Determine if the action blocks the release.
4. Write `.qa-ai/output/defect-triage.md` with the proposed actions table.
5. Optionally write `.qa-ai/output/qa-action-plan.md` with priority-ordered actions.
6. When an issue tracker is configured (`tools.issueTracker`), prepare a local draft task file.
7. Run `node .qa-ai/scripts/validate-defect-triage.mjs`.
8. Fix validation errors until the artifact passes.

## Safety

- Never create issues in external systems without governed approval.
- Do not assign actions to real people; use role suggestions.
- Blocking actions feed the release gate; do not modify the gate file directly.
- `risk-accepted` actions require documented approver and reason.
