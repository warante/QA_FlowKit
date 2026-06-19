@rf:RF-103 @id:TC-103-001 @priority:high @type:api @manual:false
Feature: Profile API returns account data

Acceptance Criteria:
- The profile endpoint returns the authenticated user's public account data.

Scenario: RF-103 TC-103-001 authenticated user retrieves profile
  Given an authenticated user has a profile with public account data
  When the client requests the profile endpoint
  Then the response contains the user's public account data
