# Test Design Proposal

## RF-004: Automated delay refund processing

## AI Component: No

## Coverage obligations

| RF     | Obligation  | Applicable | Rationale                                     | Evidence        |
| ------ | ----------- | ---------- | --------------------------------------------- | --------------- |
| RF-004 | positive    | yes        | Happy path refund flow                        | TC-001          |
| RF-004 | negative    | yes        | Token expired and payment failure             | TC-004          |
| RF-004 | alternative | yes        | Cancellation, force majeure, coupon scenarios | TC-003, TC-005  |
| RF-004 | boundary    | yes        | 60-179 min vs >= 180 min delay thresholds     | TC-006          |
| RF-004 | performance | no         | Covered via source NFR table                  | RFN-004-PERF-01 |
| RF-004 | security    | no         | Covered via source NFR table                  | RFN-004-SEC-01  |

## Non-functional coverage

| RF     | NFR ID          | Attribute   | Applicable | Evidence type | Evidence reference                                          | Threshold / oracle                                                 | Environment or precondition                       | Status  | Rationale                                   |
| ------ | --------------- | ----------- | ---------- | ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- | ------- | ------------------------------------------- |
| RF-004 | RFN-004-SEC-01  | security    | yes        | feature       | features/functional/RF-004-TC-010-token-not-exposed.feature | No full payment token or sensitive fragments in logs or email body | Staging with log capture and notification sandbox | planned | Source RFN requires observable non-exposure |
| RF-004 | RFN-004-PERF-01 | performance | yes        | test-plan     | qa-ai-output/nfr/RF-004-performance-plan.md                 | Trigger-to-result <= 5 s per transaction                           | Staging gateway stub with controlled latency      | planned | Source RFN defines measurable threshold     |

## Proposed tests

| RF     | CA             | Test ID | Title                     | Type       | Technique        |
| ------ | -------------- | ------- | ------------------------- | ---------- | ---------------- |
| RF-004 | CA-004-1       | TC-001  | Delayed flight refund     | functional | use-case-testing |
| RF-004 | CA-004-4       | TC-004  | Expired payment token     | negative   | error-guessing   |
| RF-004 | RFN-004-SEC-01 | TC-010  | Payment token not exposed | security   | error-guessing   |

## Residual coverage gaps

Performance measurement depends on approved staging environment access.
