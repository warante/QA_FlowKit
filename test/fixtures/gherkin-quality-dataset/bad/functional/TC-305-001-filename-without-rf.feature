@rf:RF-305 @id:TC-305-001 @priority:low @type:functional @manual:false
Feature: Archive item

Acceptance Criteria:
- A user can archive an item that is no longer active.

Scenario: RF-305 TC-305-001 user archives an item
  Given the item is inactive
  When the user archives the item
  Then the item appears in the archive
