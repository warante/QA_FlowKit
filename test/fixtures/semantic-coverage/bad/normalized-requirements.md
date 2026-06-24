# Normalized Requirements

## RF-004: Automated delay refund processing

### Normalized Criteria

| Criterion ID | RF     | Source CA / rule | Condition or partition               | Expected observable outcome                 | Type       | Status           | Traceability |
| ------------ | ------ | ---------------- | ------------------------------------ | ------------------------------------------- | ---------- | ---------------- | ------------ |
| CR-RF-004-01 | RF-004 | CA-1             | delay < 60 min, eligible booking     | no automated refund below 60 minutes        | boundary   | ready            | RF-004 CA-1  |
| CR-RF-004-03 | RF-004 | CA-1             | delay 61-178 min, eligible booking   | no automated refund inside range            | functional | ready            | RF-004 CA-1  |
| CR-RF-004-05 | RF-004 | CA-1             | delay = 180 min                      | threshold inclusive vs exclusive unresolved | boundary   | pending-decision | RF-004 CA-1  |
| CR-RF-004-06 | RF-004 | CA-1             | delay > 180 min                      | full refund and REFUNDED_AUTOMATIC          | functional | ready            | RF-004 CA-1  |
| CR-RF-004-07 | RF-004 | CA-1 / BR-01     | non-premium or payment not COMPLETED | automated refund is not triggered           | negative   | ready            | RF-004 BR-01 |
| CR-RF-004-08 | RF-004 | CA-2             | non-meteorological cancellation      | immediate full refund including taxes       | functional | ready            | RF-004 CA-2  |
| CR-RF-004-09 | RF-004 | CA-3             | meteorological force majeure         | PENDING_INSURANCE_VALIDATION                | negative   | ready            | RF-004 CA-3  |
| CR-RF-004-10 | RF-004 | CA-4             | expired payment token                | REFUND_FAILED_MANUAL_REVIEW                 | negative   | ready            | RF-004 CA-4  |

## Non-functional requirements

| RF     | NFR ID          | Attribute   | Source evidence                 | Measurable acceptance criterion | Suggested evidence | Status         |
| ------ | --------------- | ----------- | ------------------------------- | ------------------------------- | ------------------ | -------------- |
| RF-004 | RFN-004-SEC-01  | security    | Tokens must not appear in logs. | No tokens in logs               | feature            | pending design |
| RF-004 | RFN-004-PERF-01 | performance | Submission within 5 seconds.    | <= 5 s per transaction          | test-plan          | pending design |
