@rf:RF-307 @id:TC-307-001 @priority:medium @type:functional @manual:false
Feature: Save preferences button styling

Acceptance Criteria:
- A user can save notification preferences.

Scenario: RF-307 TC-307-001 user saves preferences with exact button styling
  Given the user opens the preferences form
  When the user clicks the blue 120 pixel wide button at the top right
  Then the green toast appears exactly 16 pixels below the header
