# Normalized Requirements

## RF-004 Automated delay refund processing

### Functional acceptance criteria

| RF     | CA ID    | Statement                                                                                           |
| ------ | -------- | --------------------------------------------------------------------------------------------------- |
| RF-004 | CA-004-1 | A delay of 180 minutes or more triggers a full refund and `REFUNDED_AUTOMATIC` status.              |
| RF-004 | CA-004-2 | A total cancellation triggers an immediate full refund including airport taxes.                     |
| RF-004 | CA-004-3 | Meteorological force majeure blocks automated refund and sets `PENDING_INSURANCE_VALIDATION`.       |
| RF-004 | CA-004-4 | An expired payment token sets `REFUND_FAILED_MANUAL_REVIEW` and notifies support and the passenger. |
| RF-004 | CA-004-5 | Refunds are issued in the original purchase currency.                                               |

## Non-functional requirements

| RF     | NFR ID          | Attribute   | Source evidence                                                                                                        | Measurable acceptance criterion                                            | Suggested evidence            | Status         |
| ------ | --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------- | -------------- |
| RF-004 | RFN-004-SEC-01  | security    | "Payment gateway tokens must never appear in application logs or plain-text email notifications."                      | Full tokens and sensitive fragments do not appear in logs or notifications | feature / automation-script   | pending design |
| RF-004 | RFN-004-PERF-01 | performance | "Validation and gateway submission must complete within 5 seconds per individual transaction after the trigger fires." | Trigger-to-result time <= 5 s per transaction                              | test-plan / automation-script | pending design |
