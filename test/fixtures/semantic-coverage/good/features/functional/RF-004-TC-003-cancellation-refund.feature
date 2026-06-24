@rf:RF-004 @id:TC-003 @priority:high @type:functional @manual:false
Feature: Non-meteorological cancellation refund

Acceptance Criteria:
- A total cancellation triggers an immediate full refund including airport taxes.

Scenario: RF-004 TC-003 non-meteorological cancellation receives full refund
  Given an eligible booking cancelled for a non-meteorological reason
  When the cancellation refund is processed
  Then a full refund including airport taxes is issued immediately
