@priority:high @type:functional @manual:true @rf:RF-101 @id:TC-001
Feature: User login
  As a registered user
  I want to log in with valid credentials
  So that I can access my account

  Acceptance Criteria:
    - Valid credentials open the dashboard

  Scenario: RF-101 TC-001 Successful login
    Given the user is on the login page
    When the user submits valid credentials
    Then the user sees the dashboard
