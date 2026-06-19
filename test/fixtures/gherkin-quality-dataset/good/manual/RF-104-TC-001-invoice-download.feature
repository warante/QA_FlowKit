@rf:RF-104 @id:TC-104-001 @priority:medium @type:functional @manual:true
Feature: Invoice download

Acceptance Criteria:
- A user can download a generated invoice from the billing history.

Scenario: RF-104 TC-104-001 user downloads an invoice
  Given a generated invoice exists in the user's billing history
  When the user downloads the invoice
  Then an invoice file is available to the user
