@rf:RF-004 @id:TC-008 @priority:medium @type:functional @manual:false
Feature: Mid-range delay no refund

Acceptance Criteria:
- Delays between 61 and 178 minutes do not trigger automated refund.

Scenario: RF-004 TC-008 mid-range delay does not trigger refund
  Given a premium booking with completed payment and a delay between 61 and 178 minutes
  When the refund trigger is evaluated
  Then no automated refund is triggered
