@smoke @rf:RF-101
Feature: UI smoke placeholder

  Scenario: Open example page
    * driver 'https://example.com'
    * match driver.title contains 'Example'
