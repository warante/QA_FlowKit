@rf:RF-303 @priority:medium @type:functional @manual:false
Feature: Notification preferences

Acceptance Criteria:
- Users can update one notification preference at a time.

@id:TC-303-001
Scenario: RF-303 TC-303-001 user enables email notifications
  Given the user is editing notification preferences
  When the user enables email notifications
  Then email notifications are enabled

@id:TC-303-002
Scenario: RF-303 TC-303-002 user disables SMS notifications
  Given the user is editing notification preferences
  When the user disables SMS notifications
  Then SMS notifications are disabled
