@smoke @rf:RF-101
Feature: Posts API

  Background:
    * url 'https://jsonplaceholder.typicode.com'

  Scenario: Get posts list
    * path 'posts'
    * method get
    * status 200
    * match response == '#array'
