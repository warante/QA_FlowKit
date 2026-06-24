# RF-004 - Automated delay refund processing

The system issues an automatic refund when a protected fare flight is delayed at least 180 minutes or cancelled for non-meteorological reasons.

## Acceptance criteria

- A delay of 180 minutes or more triggers a full refund and `REFUNDED_AUTOMATIC` status.
- Source text also mentions delays greater than 3 hours without clarifying whether 180 minutes is inclusive.
- A total cancellation triggers an immediate full refund including airport taxes.
- Meteorological force majeure blocks automated refund and sets `PENDING_INSURANCE_VALIDATION`.
- An expired payment token sets `REFUND_FAILED_MANUAL_REVIEW` and notifies support and the passenger.
- Refunds are issued in the original purchase currency.
- Only premium fare bookings with completed payment are eligible for automated refund.

## Non-functional requirements

- **RFN-Security:** Payment gateway tokens must never appear in application logs or plain-text notifications.
- **RFN-Performance:** Validation and gateway submission must complete within 5 seconds per transaction after the trigger fires.
