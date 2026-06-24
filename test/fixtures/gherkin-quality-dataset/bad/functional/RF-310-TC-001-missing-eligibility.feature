@rf:RF-310 @id:TC-310-001 @priority:high @type:negative @manual:false
Feature: Missing eligibility precondition

Acceptance Criteria:
- Non-premium bookings must not receive automated refund.

Scenario: RF-310 TC-310-001 refund without premium precondition
  Given a booking exists
  When the refund trigger is evaluated
  Then the booking reaches REFUNDED_AUTOMATIC status
