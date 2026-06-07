@smoke @rf:RF-401 @id:TC-001
Feature: Account balance API execution

  Scenario: Retrieve account balance
    * url karate.properties['baseUrl']
    * path 'api', 'accounts', 'demo', 'balance'
    * method get
    * status 200
    * match response == { accountId: 'demo', amount: 125.50, currency: 'EUR' }
