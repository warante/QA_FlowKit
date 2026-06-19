@rf:RF-105 @id:TC-105-001 @priority:high @type:e2e @manual:false
Feature: Checkout confirmation

Acceptance Criteria:
- A successful checkout produces a visible order confirmation.

Scenario: RF-105 TC-105-001 shopper completes checkout
  Given a shopper has an item in the cart and valid payment details
  When the shopper completes checkout
  Then an order confirmation with the order reference is displayed
