# Test Design Proposal

## Official RF ID

RF-004

## Scope

Automated delay refund processing.

## Proposed tests

| RF     | CA / rule | Criterion IDs | Test ID | Title                         | Type       | Technique                | Evidence type     | Artifact path                                                 | Expected result focus       | Priority | Manual | Action |
| ------ | --------- | ------------- | ------- | ----------------------------- | ---------- | ------------------------ | ----------------- | ------------------------------------------------------------- | --------------------------- | -------- | ------ | ------ |
| RF-004 | CA-1      | CR-RF-004-06  | TC-001  | Delay above threshold refund  | functional | use-case-testing         | feature           | features/functional/RF-004-TC-001-delay-refund.feature        | REFUNDED_AUTOMATIC          | high     | no     | create |
| RF-004 | CA-2      | CR-RF-004-08  | TC-003  | Cancellation refund           | functional | use-case-testing         | feature           | features/functional/RF-004-TC-003-cancellation-refund.feature | full refund                 | high     | no     | create |
| RF-004 | CA-3      | CR-RF-004-09  | TC-004  | Force majeure                 | negative   | decision-table           | feature           | features/functional/RF-004-TC-004-force-majeure.feature       | PENDING_INSURANCE           | medium   | no     | create |
| RF-004 | CA-4      | CR-RF-004-10  | TC-005  | Expired token                 | negative   | error-guessing           | feature           | features/functional/RF-004-TC-005-expired-token.feature       | REFUND_FAILED_MANUAL_REVIEW | high     | no     | create |
| RF-004 | CA-1      | CR-RF-004-03  | TC-008  | Mid-range delay               | functional | equivalence-partitioning | feature           | features/functional/RF-004-TC-008-mid-range.feature           | no refund                   | medium   | no     | create |
| RF-004 | CA-1      | CR-RF-004-05  | TC-015  | Missing feature planned       | boundary   | technical-review         | feature           | features/functional/RF-004-TC-015-missing.feature             | should exist but does not   | medium   | no     | create |
| RF-004 | CA-1      | CR-RF-004-06  | TC-016  | Invalid technique as evidence | functional | automation-script        | automation-script | qa-ai-output/scripts/refund-check.mjs                         | script only                 | low      | yes    | create |

## Coverage obligations

| RF     | Obligation | Applicable | Evidence | Rationale        |
| ------ | ---------- | ---------- | -------- | ---------------- |
| RF-004 | positive   | yes        | TC-001   | Happy path       |
| RF-004 | negative   | yes        | TC-005   | Failure path     |
| RF-004 | boundary   | yes        | TC-008   | Partial boundary |

## Existing tests to reuse

None.

## Existing tests requiring modification

None.

## New tests to create

TC-001, TC-003, TC-004, TC-005, TC-008, TC-015, TC-016.

## Ambiguities requiring user decision

Threshold at 180 minutes remains unresolved in normalized requirements.

## Approval request

Do you approve generating the proposed `.feature` files?
