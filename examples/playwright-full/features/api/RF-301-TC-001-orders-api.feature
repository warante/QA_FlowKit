@priority:high @type:api @manual:false @rf:RF-301 @id:TC-001
Feature: Orders API
  As an application client
  I want to retrieve current orders
  So that I can display fulfillment status

  Acceptance Criteria:
    - The API lists the ready QA handbook order

  Scenario: RF-301 TC-001 List orders
    Given the order service contains the QA handbook order
    When the client requests current orders
    Then the response marks the order as ready
