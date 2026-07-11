@priority:high @type:e2e @manual:false @rf:RF-201 @id:TC-002
Feature: Profile page
  As a signed-in user
  I want to view my profile
  So that I can confirm my account details

  Acceptance Criteria:
    - The profile page shows the current user's name

  Scenario: RF-201 TC-002 View profile
    Given the user opens the profile page
    When the page finishes loading
    Then the user sees the name Ada Lovelace
