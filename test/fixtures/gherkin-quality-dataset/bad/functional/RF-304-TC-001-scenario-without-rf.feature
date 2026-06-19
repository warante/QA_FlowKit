@rf:RF-304 @id:TC-304-001 @priority:high @type:functional @manual:false
Feature: Export report

Acceptance Criteria:
- Users can export a report for the selected period.

Scenario: User exports the report
  Given a report period is selected
  When the user exports the report
  Then the report file is available
