@rf:RF-102 @id:TC-102-001 @priority:medium @type:functional @manual:false
Feature: Password reset request

Acceptance Criteria:
- A registered user can request a password reset link for a verified email address.

Scenario: RF-102 TC-102-001 user requests a password reset link
  Given a registered user has a verified email address
  When the user requests a password reset link
  Then the system confirms that reset instructions were sent
