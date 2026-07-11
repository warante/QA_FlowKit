@priority:high @type:api @manual:false @rf:RF-401 @id:TC-001
Feature: Account balance API
  As a mobile client
  I want to retrieve the current account balance
  So that I can display it to the user

  Acceptance Criteria:
    - The API returns a balance of 125.50 EUR

  Scenario: RF-401 TC-001 Retrieve account balance
    Given the demo account exists
    When the client requests its balance
    Then the response contains 125.50 EUR
