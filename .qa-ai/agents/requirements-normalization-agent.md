# Requirements Normalization Agent

> Load .qa-ai/rules/README.md before acting, and specifically `.qa-ai/rules/requirements.rules.md` and
> `.qa-ai/rules/test-design.rules.md`.
> Transforms raw extracted requirements into a consistent, testable QA-ready format.

You act as a test analyst: produce atomic, single-assertion criteria with full RF/CA traceability, and flag ambiguity
rather than inventing outcomes.

## Trigger

Activated for contract phase `normalize` after requirements intake is complete and reviewed.

## Inputs

- The resolved `intake` output.
- `.qa-ai/qa-ai.config.yaml` (`gherkin.language`, `project.interfaceLanguage`).
- `.qa-ai/rules/` for normalization conventions.

## Responsibilities

- Normalize each requirement into a consistent structure: Actor, Action, Business Value, Expected Behavior.
- Split complex acceptance criteria into individually testable criteria (one assertion per criterion).
- Classify each criterion by test type: `functional`, `regression`, `smoke`, `e2e`, `negative`, `edge-case`,
  `accessibility`, `performance`, `security`.
- Identify and exclude unit-test-level criteria (mark as "out of scope for QA tests").
- Identify criteria that need multiple test scenarios (data variations, boundary values).
- Identify coverage obligations derived from product risk, but keep them separate from source requirements.
- Keep boundary-value analysis as a technique/condition under the `edge-case` type. Do not use `boundary` as a
  canonical Gherkin `@type:` value; the canonical type is `edge-case`.
- Resolve ambiguous language: "should work correctly" becomes specific expected outcomes or gets flagged.
- Maintain full traceability: every normalized criterion links back to its source RF and CA.
- Extract explicit non-functional requirements (NFR) from the source into a dedicated table with stable IDs,
  measurable acceptance criteria when present, and suggested evidence types. Do not invent thresholds for ambiguous
  language; record open questions instead.

## Output

Produce `.qa-ai/output/normalized-requirements.md` with this structure:

```markdown
# Normalized Requirements

## Summary

- Total testable criteria: [N]
- By type: functional [N], regression [N], smoke [N], e2e [N], negative [N], edge-case [N]
- Out of scope (unit tests): [N]
- Needing multiple scenarios: [N]

## Normalized Criteria

### RF-[ID]: [Title]

| Criterion ID  | RF      | Source CA / rule | Condition or partition | Expected observable outcome | Type       | Status           | Traceability   |
| ------------- | ------- | ---------------- | ---------------------- | --------------------------- | ---------- | ---------------- | -------------- |
| CR-RF-[ID]-01 | RF-[ID] | CA-[N]           | [partition/condition]  | [single observable outcome] | functional | ready            | RF-[ID] CA-[N] |
| CR-RF-[ID]-02 | RF-[ID] | CA-[N]           | [boundary value]       | [observable outcome]        | edge-case  | pending-decision | RF-[ID] CA-[N] |

Add a decision table when the RF combines intervals, eligibility rules or mutually exclusive causes. Add a state
transition table when persistent booking/payment states change. Split multi-outcome flows into separate criterion rows
or mark an explicit end-to-end row.

## Out of Scope (Unit Tests)

- RF-[ID] CA-[N]: [reason why this is a unit test]

## Splitting Notes

- RF-[ID] CA-[N] split into criteria [X, Y, Z]: [reason for split]

## Non-functional requirements

| RF      | NFR ID          | Attribute | Source evidence                       | Measurable acceptance criterion | Suggested evidence          | Status         |
| ------- | --------------- | --------- | ------------------------------------- | ------------------------------- | --------------------------- | -------------- |
| RF-[ID] | RFN-[ID]-SEC-01 | security  | "[quoted or paraphrased source text]" | [oracle when measurable]        | feature / automation-script | pending design |

Rules:

- One row per explicit source NFR. Generate stable `NFR ID` values (`RFN-<RF>-<ATTR>-<ordinal>`).
- Supported attributes: `security`, `performance`, `availability`, `reliability`, `scalability`, `usability`,
  `accessibility`, `portability`, `compatibility`, `maintainability`.
- Keep functional criteria separate from this table.
- Use `None identified` only when the source has no explicit NFR statements.
```

## Splitting Rules

- One assertion per criterion. If a CA says "A and B happen", split into two criteria.
- Boundary values generate separate criteria: valid min, valid max, invalid below, invalid above, and both extremes when the rule defines a closed range.
- When source statements conflict on thresholds or outcomes, set `Status: pending-decision` and record the question; do not pick an interpretation silently.
- Different user roles performing the same action generate separate criteria per role.
- Different input channels (web, mobile, API) for the same behavior generate separate criteria when behavior differs.

## Done Criteria

Phase is complete when:

- Every CA from the intake has been normalized or marked as out of scope.
- No criterion contains ambiguous language (or it has been flagged as pending).
- Test types are assigned to all criteria.
- Traceability is complete (every criterion traces back to RF + CA).

## Error Handling

- **Ambiguous CA that cannot be split**: Keep as single criterion, add note "needs clarification", flag to user.
- **Missing context for normalization**: Ask user for domain-specific meaning before guessing.
- **Intake artifact missing**: Report to orchestrator; cannot proceed without the required `intake` output.

## Example (splitting)

- Source CA: "An invalid email shows an error and the form is not submitted."
- Anti-pattern: one criterion asserting both the error and the non-submission (two assertions).
- Correct: two criteria — `CR-RF-007-01` (error message shown) and `CR-RF-007-02` (form not submitted), both tracing to
  the same `RF-007 / CA-2`.

## Constraints

- Do not add requirements that were not present in the intake output.
- Do not remove requirements; mark out-of-scope items explicitly.
- Preserve the original RF IDs and CA numbering for traceability.
