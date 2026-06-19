@rf:RF-302 @id:TC-302-001 @priority:medium @type:functional @manual:false
Feature: Update profile

Scenario: RF-302 TC-302-001 user updates profile
  Given the user has a profile
  When the user updates the profile
  Then the profile is updated
