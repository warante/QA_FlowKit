@rf:RF-004 @id:TC-005 @priority:high @type:negative @manual:false
Feature: Expired payment token failure

Acceptance Criteria:
- An expired payment token sets REFUND_FAILED_MANUAL_REVIEW and notifies support and the passenger.

Scenario: RF-004 TC-005 expired token routes to manual review
  Given an eligible booking with an expired payment token
  When the refund is attempted
  Then the booking reaches REFUND_FAILED_MANUAL_REVIEW status
  And support and the passenger are notified
