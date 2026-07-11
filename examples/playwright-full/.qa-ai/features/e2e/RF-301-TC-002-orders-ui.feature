@priority:high @type:e2e @manual:false @rf:RF-301 @id:TC-002
Feature: Orders page
  As a user
  I want to see my current orders
  So that I can confirm their status

  Acceptance Criteria:
    - The page displays the QA handbook order with ready status

  Scenario: RF-301 TC-002 View orders
    Given the user opens the orders page
    When the order list loads
    Then the QA handbook order is shown as ready
