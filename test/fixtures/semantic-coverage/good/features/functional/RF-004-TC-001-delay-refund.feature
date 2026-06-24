@rf:RF-004 @id:TC-001 @priority:high @type:functional @manual:false
Feature: Delay above threshold refund

Acceptance Criteria:
- A delay greater than 180 minutes triggers a full refund and REFUNDED_AUTOMATIC status for an eligible booking.

Scenario: RF-004 TC-001 eligible booking with delay above threshold receives automatic refund
  Given a premium booking with completed payment and a delay above 180 minutes
  When the refund trigger is evaluated
  Then the booking reaches REFUNDED_AUTOMATIC status
  And a full refund is issued to the original payment method
