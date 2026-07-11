@smoke @rf:RF-201 @id:TC-001
Feature: Profile API execution

  Scenario: Retrieve the current profile
    * url karate.properties['baseUrl']
    * path 'api', 'profile'
    * method get
    * status 200
    * match response == { id: 201, name: 'Ada Lovelace', role: 'QA Engineer' }
