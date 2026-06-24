# Normalized Requirements

## RF-004: Automated delay refund processing

### Decision table: delay threshold

| Delay minutes | Premium + completed payment | Expected outcome                                        |
| ------------- | --------------------------- | ------------------------------------------------------- |
| < 60          | yes                         | no automated refund                                     |
| 60            | yes                         | no automated refund (lower boundary)                    |
| 61-178        | yes                         | no automated refund                                     |
| 179           | yes                         | no automated refund (upper boundary below threshold)    |
| 180           | yes                         | pending user decision: inclusive vs exclusive threshold |
| > 180         | yes                         | full refund and REFUNDED_AUTOMATIC                      |

### Normalized Criteria

| Criterion ID | RF     | Source CA / rule | Condition or partition               | Expected observable outcome                           | Type       | Status           | Traceability |
| ------------ | ------ | ---------------- | ------------------------------------ | ----------------------------------------------------- | ---------- | ---------------- | ------------ |
| CR-RF-004-01 | RF-004 | CA-1             | delay < 60 min, eligible booking     | no automated refund is triggered                      | boundary   | ready            | RF-004 CA-1  |
| CR-RF-004-02 | RF-004 | CA-1             | delay = 60 min, eligible booking     | no automated refund at lower boundary                 | boundary   | ready            | RF-004 CA-1  |
| CR-RF-004-03 | RF-004 | CA-1             | delay 61-178 min, eligible booking   | no automated refund inside range                      | functional | ready            | RF-004 CA-1  |
| CR-RF-004-04 | RF-004 | CA-1             | delay = 179 min, eligible booking    | no automated refund at upper boundary below threshold | boundary   | ready            | RF-004 CA-1  |
| CR-RF-004-05 | RF-004 | CA-1             | delay = 180 min, eligible booking    | threshold inclusive vs exclusive unresolved           | boundary   | pending-decision | RF-004 CA-1  |
| CR-RF-004-06 | RF-004 | CA-1             | delay > 180 min, eligible booking    | full refund and booking reaches REFUNDED_AUTOMATIC    | functional | ready            | RF-004 CA-1  |
| CR-RF-004-07 | RF-004 | CA-1 / BR-01     | non-premium or payment not COMPLETED | automated refund is not triggered                     | negative   | ready            | RF-004 BR-01 |
| CR-RF-004-08 | RF-004 | CA-2             | non-meteorological cancellation      | immediate full refund including taxes                 | functional | ready            | RF-004 CA-2  |
| CR-RF-004-09 | RF-004 | CA-3             | meteorological force majeure         | PENDING_INSURANCE_VALIDATION, no automated refund     | negative   | ready            | RF-004 CA-3  |
| CR-RF-004-10 | RF-004 | CA-4             | expired payment token                | REFUND_FAILED_MANUAL_REVIEW and notifications sent    | negative   | ready            | RF-004 CA-4  |
| CR-RF-004-11 | RF-004 | CA-5             | successful refund path               | refund issued in original purchase currency           | functional | ready            | RF-004 CA-5  |

## Non-functional requirements

| RF     | NFR ID          | Attribute   | Source evidence                                                               | Measurable acceptance criterion               | Suggested evidence            | Status         |
| ------ | --------------- | ----------- | ----------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------- | -------------- |
| RF-004 | RFN-004-SEC-01  | security    | Payment gateway tokens must never appear in logs or plain-text notifications. | No full tokens in logs or notification body   | feature / technical-review    | pending design |
| RF-004 | RFN-004-PERF-01 | performance | Validation and submission within 5 seconds after trigger.                     | Trigger-to-result time <= 5 s per transaction | test-plan / automation-script | pending design |
