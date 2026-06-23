# Test Design Proposal (per RF / epic)

> Per-RF or per-epic test cases. For system-wide strategy see `qa-ai-output/test-design-system.md` (standard and enterprise tracks).

## Official RF ID

<!-- Required before final .feature generation -->

## Scope

## Proposed tests

| RF  | CA  | Test ID | Title | Type | Technique | AI component | Risk | Applicability | Priority | Manual | Action |
| --- | --- | ------- | ----- | ---- | --------- | ------------ | ---- | ------------- | -------- | ------ | ------ |

## Coverage obligations

| RF  | Obligation | Applicable | Evidence | Rationale |
| --- | ---------- | ---------- | -------- | --------- |

Use `positive`, `negative`, `alternative`, `boundary`, `accessibility`, `performance` and `security` as obligation
values. When an obligation is not applicable, set `Applicable` to `no` and explain why.

## Non-functional coverage

| RF  | NFR ID | Attribute | Applicable | Evidence type | Evidence reference | Threshold / oracle | Environment or precondition | Status | Rationale |
| --- | ------ | --------- | ---------- | ------------- | ------------------ | ------------------ | --------------------------- | ------ | --------- |

Record one row per source NFR from `normalized-requirements.md`. `Applicable: no` requires a requirement-specific
rationale; disabling preventive coverage flags is not a valid exclusion. Supported evidence types: `feature`,
`automation-script`, `manual-charter`, `test-plan`, `technical-review`, `residual-risk`. `residual-risk` documents
a blocked gap and does not count as satisfied coverage in `strict` mode.

## Security review

| RF  | Category | Applicable | Evidence or test | Rationale |
| --- | -------- | ---------- | ---------------- | --------- |

This is a functional security review, not penetration testing or a compliance claim.

## Residual coverage gaps

## Existing tests to reuse

## Existing tests requiring modification

## New tests to create

## Ambiguities requiring user decision

## Approval request

Do you approve generating the proposed `.feature` files?
