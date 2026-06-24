@rf:RF-004 @id:TC-007 @priority:medium @type:boundary @manual:false
Feature: Exactly 60 minute delay boundary

Acceptance Criteria:
- A delay of exactly 60 minutes does not trigger automated refund at the lower boundary.

Scenario: RF-004 TC-007 delay at 60 minutes does not trigger refund
  Given a premium booking with completed payment and a delay of exactly 60 minutes
  When the refund trigger is evaluated
  Then no automated refund is triggered
