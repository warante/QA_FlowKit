# Traceability Matrix

| Requirement Source | RF     | CA   | Criterion IDs | Feature File                                                  | Test Management Case ID | Type       | Priority | Automation Status | Automation File |
| ------------------ | ------ | ---- | ------------- | ------------------------------------------------------------- | ----------------------- | ---------- | -------- | ----------------- | --------------- |
| RF-004-refunds.md  | RF-004 | CA-1 | CR-RF-004-06  | features/functional/RF-004-TC-001-delay-refund.feature        | TC-001                  | functional | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-2 | CR-RF-004-08  | features/functional/RF-004-TC-003-cancellation-refund.feature | TC-003                  | functional | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-3 | CR-RF-004-09  | features/functional/RF-004-TC-004-force-majeure.feature       | TC-004                  | negative   | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-4 | CR-RF-004-10  | features/functional/RF-004-TC-005-expired-token.feature       | TC-005                  | negative   | high     | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1 | CR-RF-004-03  | features/functional/RF-004-TC-008-mid-range.feature           | TC-008                  | functional | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1 | CR-RF-004-05  | features/functional/RF-004-TC-015-missing.feature             | TC-015                  | boundary   | medium   | manual            |                 |
| RF-004-refunds.md  | RF-004 | CA-1 | CR-RF-004-06  | features/functional/RF-004-TC-999-nonexistent.feature         | TC-999                  | functional | low      | manual            |                 |

## Non-functional traceability

| Requirement source | RF     | NFR ID         | Attribute | Evidence type | Evidence reference                                    | Status  | Residual risk |
| ------------------ | ------ | -------------- | --------- | ------------- | ----------------------------------------------------- | ------- | ------------- |
| RF-004-refunds.md  | RF-004 | RFN-004-SEC-01 | security  | feature       | features/functional/RF-004-TC-010-missing-nfr.feature | planned | Missing file  |
