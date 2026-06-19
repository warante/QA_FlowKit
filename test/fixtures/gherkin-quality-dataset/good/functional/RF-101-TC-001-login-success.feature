@rf:RF-101 @id:TC-101-001 @priority:high @type:functional @manual:false
Feature: Login succeeds

Acceptance Criteria:
- A registered user can access the account home page after entering valid credentials.

Scenario: RF-101 TC-101-001 user signs in with valid credentials
  Given a registered user has active valid credentials
  When the user signs in with those credentials
  Then the account home page is displayed for that user
