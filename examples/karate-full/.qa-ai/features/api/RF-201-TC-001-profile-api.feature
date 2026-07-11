@priority:high @type:api @manual:false @rf:RF-201 @id:TC-001
Feature: Profile API
  As a client application
  I want to retrieve the current user profile
  So that I can display account information

  Acceptance Criteria:
    - The profile API returns the current demo user

  Scenario: RF-201 TC-001 Retrieve profile
    Given the profile service is available
    When the client requests the current profile
    Then the response contains the demo user's name
