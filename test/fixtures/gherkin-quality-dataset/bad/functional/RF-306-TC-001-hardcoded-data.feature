@rf:RF-306 @id:TC-306-001 @priority:high @type:functional @manual:false
Feature: Production customer update

Acceptance Criteria:
- A support agent can update a customer's contact preference.

Scenario: RF-306 TC-306-001 agent updates production customer
  Given production customer maria@example.com exists in account 998877
  When the support agent updates that customer's contact preference at 23:59 today
  Then the contact preference is updated for maria@example.com
