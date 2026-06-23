# Normalized Requirements

## RF-020 Self-service booking summary

### Functional acceptance criteria

| RF     | CA ID    | Statement                                              |
| ------ | -------- | ------------------------------------------------------ |
| RF-020 | CA-020-1 | A signed-in user can view the booking summary screen.  |
| RF-020 | CA-020-2 | The summary shows itinerary, passenger and fare total. |

## Non-functional requirements

| RF     | NFR ID          | Attribute     | Source evidence                                                             | Measurable acceptance criterion                       | Suggested evidence            | Status         |
| ------ | --------------- | ------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------- | -------------- |
| RF-020 | RFN-020-SEC-01  | security      | "Booking references must not appear in client-side error logs."             | No PNR or booking token in browser console logs       | feature / automation-script   | pending design |
| RF-020 | RFN-020-PERF-01 | performance   | "Summary screen must render within 2 seconds on a mid-tier device profile." | First meaningful paint <= 2 s on reference profile    | test-plan / automation-script | pending design |
| RF-020 | RFN-020-USE-01  | usability     | "A first-time traveler completes the summary review without external help." | 80% task success in moderated usability session       | manual-charter                | pending design |
| RF-020 | RFN-020-COMP-01 | compatibility | "Layout remains usable on latest Chrome, Firefox, Safari and Edge."         | No blocking layout defect on supported browser matrix | technical-review / test-plan  | pending design |
