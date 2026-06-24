@rf:RF-004 @id:TC-011 @priority:medium @type:functional @manual:false
Feature: Original currency refund

Acceptance Criteria:
- Refunds are issued in the original purchase currency.

Scenario: RF-004 TC-011 refund uses original purchase currency
  Given an eligible booking purchased in a non-default currency
  When a successful refund is issued
  Then the refund amount is denominated in the original purchase currency
