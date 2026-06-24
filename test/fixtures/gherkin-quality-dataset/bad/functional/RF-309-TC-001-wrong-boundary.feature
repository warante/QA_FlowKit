@rf:RF-309 @id:TC-309-001 @priority:medium @type:boundary @manual:false
Feature: Wrong delay threshold in scenario

Acceptance Criteria:
- A delay of exactly 179 minutes must not trigger automated refund.

Scenario: RF-309 TC-309-001 delay at 180 minutes does not trigger refund
  Given a premium booking with completed payment and a delay of exactly 180 minutes
  When the refund trigger is evaluated
  Then no automated refund is triggered
