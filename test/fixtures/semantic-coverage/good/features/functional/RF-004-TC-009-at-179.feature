@rf:RF-004 @id:TC-009 @priority:medium @type:boundary @manual:false
Feature: 179 minute delay boundary

Acceptance Criteria:
- A delay of 179 minutes does not trigger automated refund below the threshold.

Scenario: RF-004 TC-009 delay at 179 minutes does not trigger refund
  Given a premium booking with completed payment and a delay of exactly 179 minutes
  When the refund trigger is evaluated
  Then no automated refund is triggered
