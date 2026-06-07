@priority:high @type:e2e @manual:false @rf:RF-401 @id:TC-002
Feature: Mobile account balance
  As a mobile user
  I want to see my current balance
  So that I understand my account position

  Acceptance Criteria:
    - The home screen displays 125.50 EUR

  Scenario: RF-401 TC-002 View account balance
    Given the user launches the mobile application
    When the home screen is visible
    Then the balance is shown as 125.50 EUR
