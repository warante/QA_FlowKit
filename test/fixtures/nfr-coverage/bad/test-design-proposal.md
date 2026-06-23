# Test Design Proposal

## RF-004: Automated delay refund processing

## AI Component: No

## Coverage obligations

| RF     | Obligation  | Applicable | Rationale                                     | Evidence       |
| ------ | ----------- | ---------- | --------------------------------------------- | -------------- |
| RF-004 | positive    | yes        | Happy path refund flow                        | TC-001         |
| RF-004 | negative    | yes        | Token expired and payment failure             | TC-004         |
| RF-004 | alternative | yes        | Cancellation, force majeure, coupon scenarios | TC-003, TC-005 |
| RF-004 | boundary    | yes        | 60-179 min vs >= 180 min delay thresholds     | TC-006         |
| RF-004 | performance | no         | Not configured for coverage                   |                |
| RF-004 | security    | no         | Not configured for coverage                   |                |

## Proposed tests

| RF     | CA       | Test ID | Title                 | Type       | Technique        |
| ------ | -------- | ------- | --------------------- | ---------- | ---------------- |
| RF-004 | CA-004-1 | TC-001  | Delayed flight refund | functional | use-case-testing |
| RF-004 | CA-004-4 | TC-004  | Expired payment token | negative   | error-guessing   |

## Residual coverage gaps

None identified at proposal stage.
