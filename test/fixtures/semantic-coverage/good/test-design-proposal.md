# Test Design Proposal

## Official RF ID

RF-004

## Scope

Automated delay refund processing for eligible premium bookings.

## Proposed tests

| RF     | CA / rule       | Criterion IDs | Test ID | Title                           | Type        | Technique                | Evidence type | Artifact path                                                 | Expected result focus                    | Priority | Manual | Action           |
| ------ | --------------- | ------------- | ------- | ------------------------------- | ----------- | ------------------------ | ------------- | ------------------------------------------------------------- | ---------------------------------------- | -------- | ------ | ---------------- |
| RF-004 | CA-1            | CR-RF-004-06  | TC-001  | Delay above threshold refund    | functional  | use-case-testing         | feature       | features/functional/RF-004-TC-001-delay-refund.feature        | REFUNDED_AUTOMATIC                       | high     | no     | create           |
| RF-004 | BR-01           | CR-RF-004-07  | TC-002  | Ineligible fare or payment      | negative    | equivalence-partitioning | feature       | features/functional/RF-004-TC-002-ineligible-booking.feature  | no automated refund                      | high     | no     | create           |
| RF-004 | CA-2            | CR-RF-004-08  | TC-003  | Non-meteorological cancellation | functional  | use-case-testing         | feature       | features/functional/RF-004-TC-003-cancellation-refund.feature | full refund with taxes                   | high     | no     | create           |
| RF-004 | CA-3            | CR-RF-004-09  | TC-004  | Meteorological force majeure    | negative    | decision-table           | feature       | features/functional/RF-004-TC-004-force-majeure.feature       | PENDING_INSURANCE_VALIDATION             | medium   | no     | create           |
| RF-004 | CA-4            | CR-RF-004-10  | TC-005  | Expired payment token           | negative    | error-guessing           | feature       | features/functional/RF-004-TC-005-expired-token.feature       | REFUND_FAILED_MANUAL_REVIEW              | high     | no     | create           |
| RF-004 | CA-1            | CR-RF-004-01  | TC-006  | Below 60 minute delay           | boundary    | boundary-value-analysis  | feature       | features/functional/RF-004-TC-006-below-60.feature            | no automated refund                      | medium   | no     | create           |
| RF-004 | CA-1            | CR-RF-004-02  | TC-007  | Exactly 60 minute delay         | boundary    | boundary-value-analysis  | feature       | features/functional/RF-004-TC-007-at-60.feature               | no automated refund at lower boundary    | medium   | no     | create           |
| RF-004 | CA-1            | CR-RF-004-03  | TC-008  | Mid-range delay no refund       | functional  | equivalence-partitioning | feature       | features/functional/RF-004-TC-008-mid-range.feature           | no automated refund                      | medium   | no     | create           |
| RF-004 | CA-1            | CR-RF-004-04  | TC-009  | 179 minute delay boundary       | boundary    | boundary-value-analysis  | feature       | features/functional/RF-004-TC-009-at-179.feature              | no automated refund below threshold      | medium   | no     | create           |
| RF-004 | CA-1            | CR-RF-004-05  | TC-012  | 180 minute threshold pending    | boundary    | boundary-value-analysis  | feature       |                                                               | pending user decision on inclusive bound | medium   | no     | pending-decision |
| RF-004 | CA-5            | CR-RF-004-11  | TC-011  | Original currency refund        | functional  | use-case-testing         | feature       | features/functional/RF-004-TC-011-original-currency.feature   | refund in purchase currency              | medium   | no     | create           |
| RF-004 | RFN-004-SEC-01  |               | TC-010  | Token not exposed in logs       | security    | error-guessing           | feature       | features/functional/RF-004-TC-010-token-not-exposed.feature   | no token in logs or notifications        | high     | no     | create           |
| RF-004 | RFN-004-PERF-01 |               | TC-013  | Performance plan                | performance | use-case-testing         | test-plan     | qa-ai-output/nfr/RF-004-performance-plan.md                   | trigger-to-result <= 5 s                 | medium   | yes    | create           |

## Coverage obligations

| RF     | Obligation  | Applicable | Evidence               | Rationale                     |
| ------ | ----------- | ---------- | ---------------------- | ----------------------------- |
| RF-004 | positive    | yes        | TC-001, TC-003, TC-011 | Happy path refund flows       |
| RF-004 | negative    | yes        | TC-002, TC-004, TC-005 | Ineligible and failure paths  |
| RF-004 | alternative | yes        | TC-003, TC-004         | Cancellation vs force majeure |
| RF-004 | boundary    | yes        | TC-006, TC-007, TC-009 | Delay partition boundaries    |
| RF-004 | performance | no         | RFN-004-PERF-01        | Covered via source NFR table  |
| RF-004 | security    | no         | RFN-004-SEC-01         | Covered via source NFR table  |

## Non-functional coverage

| RF     | NFR ID          | Attribute   | Applicable | Evidence type | Evidence reference                                          | Threshold / oracle              | Environment or precondition | Status  | Rationale                    |
| ------ | --------------- | ----------- | ---------- | ------------- | ----------------------------------------------------------- | ------------------------------- | --------------------------- | ------- | ---------------------------- |
| RF-004 | RFN-004-SEC-01  | security    | yes        | feature       | features/functional/RF-004-TC-010-token-not-exposed.feature | No tokens in logs or email body | Staging with log capture    | planned | Source RFN requires oracle   |
| RF-004 | RFN-004-PERF-01 | performance | yes        | test-plan     | qa-ai-output/nfr/RF-004-performance-plan.md                 | <= 5 s per transaction          | Staging gateway stub        | planned | Source RFN defines threshold |

## Existing tests to reuse

None.

## Existing tests requiring modification

None.

## New tests to create

TC-001 through TC-011 and TC-013 as listed above. TC-012 deferred pending threshold decision.

## Ambiguities requiring user decision

- CR-RF-004-05 / TC-012: Is a delay of exactly 180 minutes inclusive (`>= 180`) or exclusive (`> 180`)? Source mentions both "180 minutes or more" and "greater than 3 hours".

## Approval request

Do you approve generating the proposed `.feature` files?
