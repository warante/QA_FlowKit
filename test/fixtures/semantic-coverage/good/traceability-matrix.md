# Traceability Matrix

| Requirement Source | RF     | CA             | Criterion IDs | Feature File                                                  | Test Management Case ID | Type       | Priority | Automation Status | Automation File |
| ------------------ | ------ | -------------- | ------------- | ------------------------------------------------------------- | ----------------------- | ---------- | -------- | ----------------- | --------------- |
| RF-004-refunds.md  | RF-004 | CA-1           | CR-RF-004-06  | features/functional/RF-004-TC-001-delay-refund.feature        | TC-001                  | functional | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | BR-01          | CR-RF-004-07  | features/functional/RF-004-TC-002-ineligible-booking.feature  | TC-002                  | negative   | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-2           | CR-RF-004-08  | features/functional/RF-004-TC-003-cancellation-refund.feature | TC-003                  | functional | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-3           | CR-RF-004-09  | features/functional/RF-004-TC-004-force-majeure.feature       | TC-004                  | negative   | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-4           | CR-RF-004-10  | features/functional/RF-004-TC-005-expired-token.feature       | TC-005                  | negative   | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1           | CR-RF-004-01  | features/functional/RF-004-TC-006-below-60.feature            | TC-006                  | boundary   | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1           | CR-RF-004-02  | features/functional/RF-004-TC-007-at-60.feature               | TC-007                  | boundary   | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1           | CR-RF-004-03  | features/functional/RF-004-TC-008-mid-range.feature           | TC-008                  | functional | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1           | CR-RF-004-04  | features/functional/RF-004-TC-009-at-179.feature              | TC-009                  | boundary   | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-5           | CR-RF-004-11  | features/functional/RF-004-TC-011-original-currency.feature   | TC-011                  | functional | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | RFN-004-SEC-01 |               | features/functional/RF-004-TC-010-token-not-exposed.feature   | TC-010                  | security   | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1           | CR-RF-004-05  |                                                               | TC-012                  | boundary   | medium   | proposal-only     |                 |

## Non-functional traceability

| Requirement source | RF     | NFR ID          | Attribute   | Evidence type | Evidence reference                                          | Status  | Residual risk              |
| ------------------ | ------ | --------------- | ----------- | ------------- | ----------------------------------------------------------- | ------- | -------------------------- |
| RF-004-refunds.md  | RF-004 | RFN-004-SEC-01  | security    | feature       | features/functional/RF-004-TC-010-token-not-exposed.feature | planned | Pending staging log access |
| RF-004-refunds.md  | RF-004 | RFN-004-PERF-01 | performance | test-plan     | .qa-ai/output/nfr/RF-004-performance-plan.md                | planned | Requires gateway stub      |
