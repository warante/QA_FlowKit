# Traceability Matrix

| Requirement Source | RF     | CA       | Feature File                                             | Test Management Case ID | Type       | Priority | Automation Status | Automation File |
| ------------------ | ------ | -------- | -------------------------------------------------------- | ----------------------- | ---------- | -------- | ----------------- | --------------- |
| RF-004-refunds.md  | RF-004 | CA-004-1 | features/functional/RF-004-TC-001-delayed-refund.feature | TC-001                  | functional | high     | proposed          |                 |

## Non-functional traceability

| Requirement source | RF     | NFR ID          | Attribute   | Evidence type | Evidence reference                                          | Status  | Residual risk                        |
| ------------------ | ------ | --------------- | ----------- | ------------- | ----------------------------------------------------------- | ------- | ------------------------------------ |
| RF-004-refunds.md  | RF-004 | RFN-004-SEC-01  | security    | feature       | features/functional/RF-004-TC-010-token-not-exposed.feature | planned | Pending approved staging log capture |
| RF-004-refunds.md  | RF-004 | RFN-004-PERF-01 | performance | test-plan     | qa-ai-output/nfr/RF-004-performance-plan.md                 | planned | Requires staging gateway stub        |
