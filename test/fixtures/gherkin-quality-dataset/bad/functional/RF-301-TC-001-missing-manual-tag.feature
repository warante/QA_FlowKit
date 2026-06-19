@rf:RF-301 @id:TC-301-001 @priority:high @type:functional
Feature: Message after login

Acceptance Criteria:
- The user sees a login result.

Scenario: RF-301 TC-301-001 user signs in
  Given the user has credentials
  When the user signs in
  Then something happens
