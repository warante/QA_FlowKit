# Test Design Proposal

## RF-020: Self-service booking summary

## AI Component: No

## Coverage obligations

| RF     | Obligation  | Applicable | Rationale                    | Evidence        |
| ------ | ----------- | ---------- | ---------------------------- | --------------- |
| RF-020 | positive    | yes        | Happy path summary           | TC-001          |
| RF-020 | performance | no         | Covered via source NFR table | RFN-020-PERF-01 |
| RF-020 | security    | no         | Covered via source NFR table | RFN-020-SEC-01  |

## Non-functional coverage

| RF     | NFR ID          | Attribute     | Applicable | Evidence type    | Evidence reference                                            | Threshold / oracle                             | Environment or precondition                  | Status  | Rationale  |
| ------ | --------------- | ------------- | ---------- | ---------------- | ------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- | ------- | ---------- |
| RF-020 | RFN-020-SEC-01  | security      | yes        | feature          | features/security/RF-020-TC-010-no-booking-in-console.feature | No booking reference in browser console output | Staging with console capture enabled         | planned | Source NFR |
| RF-020 | RFN-020-PERF-01 | performance   | yes        | test-plan        | qa-ai-output/nfr/RF-020-performance-plan.md                   | First meaningful paint <= 2 s                  | Reference mid-tier device profile            | planned | Source NFR |
| RF-020 | RFN-020-USE-01  | usability     | yes        | manual-charter   | qa-ai-output/nfr/RF-020-usability-charter.md                  | 80% moderated task success                     | Lab session with first-time traveler profile | planned | Source NFR |
| RF-020 | RFN-020-COMP-01 | compatibility | yes        | technical-review | qa-ai-output/nfr/RF-020-compatibility-matrix.md               | No blocking layout defect on matrix            | Latest Chrome, Firefox, Safari, Edge         | planned | Source NFR |

## Proposed tests

| RF     | CA             | Test ID | Title                 | Type       | Technique        |
| ------ | -------------- | ------- | --------------------- | ---------- | ---------------- |
| RF-020 | CA-020-1       | TC-001  | View booking summary  | functional | use-case-testing |
| RF-020 | RFN-020-SEC-01 | TC-010  | No booking in console | security   | error-guessing   |

## Residual coverage gaps

Usability lab scheduling pending participant recruitment.
