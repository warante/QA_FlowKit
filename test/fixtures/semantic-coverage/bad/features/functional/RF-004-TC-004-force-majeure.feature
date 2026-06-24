@rf:RF-004 @id:TC-004 @priority:medium @type:negative @manual:false
Feature: Meteorological force majeure blocks refund

Acceptance Criteria:
- Meteorological force majeure blocks automated refund and sets PENDING_INSURANCE_VALIDATION.

Scenario: RF-004 TC-004 meteorological cancellation blocks automated refund
  Given an eligible booking cancelled for meteorological force majeure
  When the refund trigger is evaluated
  Then the booking reaches PENDING_INSURANCE_VALIDATION status
