@rf:RF-004 @id:TC-002 @priority:high @type:negative @manual:false
Feature: Ineligible fare or payment blocks refund

Acceptance Criteria:
- Non-premium fare or payment not in COMPLETED state must not receive automated refund.

Scenario: RF-004 TC-002 ineligible booking does not trigger automated refund
  Given a booking that is not premium or payment is not COMPLETED
  When the refund trigger is evaluated
  Then no automated refund is triggered
  And the booking does not reach REFUNDED_AUTOMATIC status
