# RF-004 - Automated delay refund processing

The system issues an automatic refund to the original payment method when a protected fare flight is delayed at least 180 minutes or cancelled for non-meteorological reasons.

## Acceptance criteria

- A delay of 180 minutes or more triggers a full refund and `REFUNDED_AUTOMATIC` status.
- A total cancellation triggers an immediate full refund including airport taxes.
- Meteorological force majeure blocks automated refund and sets `PENDING_INSURANCE_VALIDATION`.
- An expired payment token sets `REFUND_FAILED_MANUAL_REVIEW` and notifies support and the passenger.
- Refunds are issued in the original purchase currency.

## Non-functional requirements

- **RFN-Security:** Payment gateway tokens must never appear in application logs or plain-text email notifications.
- **RFN-Performance:** Validation and gateway submission must complete within 5 seconds per individual transaction after the trigger fires.
