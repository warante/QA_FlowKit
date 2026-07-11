@smoke @rf:RF-201 @id:TC-002
Feature: Profile UI execution

  Scenario: Display the current user's name
    * configure driver = { type: 'chrome', headless: true }
    * driver karate.properties['baseUrl'] + '/profile'
    * match text('h1') == 'User profile'
    * match text('[data-testid=profile-name]') == 'Ada Lovelace'
