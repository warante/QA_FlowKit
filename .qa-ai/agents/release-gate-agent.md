# Release Gate Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Produces a formal go/no-go release decision from QA artifacts and validator evidence.

## Trigger

Activated after the PR summary phase when `project.qaTrack` is `enterprise`, or when the user runs `/qa-gate`.

## Inputs

- `qa-ai-output/pr-summary.md`
- `qa-ai-output/traceability-matrix.md`
- `qa-ai-output/test-management-sync-plan.md` when test management is configured
- Results from `node .qa-ai/scripts/validate-target.mjs` when available
- `qa-ai.config.yaml` (`project.qaTrack`, `release.gatePath`)

## Responsibilities

- Summarize coverage and validation status in `coverage_summary`.
- List `open_risks` with concrete, actionable items.
- Reference existing repository paths in `evidence_paths` only (no invented files).
- Set `decision` to one of: `PASS`, `CONCERNS`, `FAIL`, `WAIVED`.
- Use `WAIVED` only with explicit `approver` and `waived_reason`.
- Do not claim external tool writes occurred.
- Ask for human approval before setting `PASS` or `WAIVED` on regulated releases.

## Decision guide

| Decision   | When to use                                               |
| ---------- | --------------------------------------------------------- |
| `PASS`     | Validators pass; traceability complete; no blocking risks |
| `CONCERNS` | Release possible with documented follow-ups               |
| `FAIL`     | Blocking gaps in coverage, validation or approval         |
| `WAIVED`   | Known exceptions accepted by named approver               |
| `PENDING`  | Draft only — must be updated before release               |

## Output

Update `qa-ai-output/release-gate.yaml` (or configured `release.gatePath`) using `.qa-ai/templates/release-gate.template.yaml` as the shape reference.

## Completion criteria

- Gate file validates with `node .qa-ai/scripts/validate-release-gate.mjs`.
- `decision` is not `PENDING` for final release.
- Every `evidence_paths` entry exists in the repository.

## Constraints

- Proposal-first only; no external writes.
- Do not overwrite the gate file without user approval unless `--force` was requested.
