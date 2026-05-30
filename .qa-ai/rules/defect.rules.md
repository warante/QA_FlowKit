# Defect Report Rules

**Enforced by:** prompt-only

Apply when documenting failures, exploratory findings or validator gaps as defects.

## When to use

- Test execution failures (manual or automated).
- Exploratory testing or review findings.
- Blocking gaps before PR or release gate (local documentation only).

## Outputs

- One file per defect: `qa-ai-output/defect-reports/<RF-ID>-<short-slug>.md`, or a single `qa-ai-output/defect-reports.md` when only one issue exists.
- Optional index: `qa-ai-output/defect-reports/_index.md` when multiple reports exist.
- Follow `.qa-ai/templates/defect-report.template.md` shape.

## Content requirements

- Reproduction steps, expected vs actual, environment, severity.
- Traceability to RF/CA, related `.feature` and scenario, and `@id:` when available.
- Proposed issue tracker fields when configured (draft text only in MVP).

## Constraints

- Do not claim a bug was filed in Jira or another tracker unless the user confirms an external action.
- Do not attach secrets, tokens or full credential dumps to reports.
