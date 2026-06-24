@rf:RF-004 @id:TC-006 @priority:medium @type:boundary @manual:false
Feature: Below 60 minute delay no refund

Acceptance Criteria:
- Delays below 60 minutes do not trigger automated refund.

Scenario: RF-004 TC-006 delay below 60 minutes does not trigger refund
  Given a premium booking with completed payment and a delay below 60 minutes
  When the refund trigger is evaluated
  Then no automated refund is triggered
