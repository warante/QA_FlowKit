# Karate API Specialist

> Framework-specific guidance for API testing with Karate DSL.

## Activation

Use when `automation.api.framework` is `karate`.

## Role

Complements the API Testing Agent by providing Karate-specific patterns, feature file conventions and constraints. The API agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing Karate feature, config and runner conventions.
- Keep reusable setup in `karate-config.js` or shared feature files according to repo patterns.
- Prefer readable scenario steps and data tables over complex scripting.
- Validate status, response structure and business-relevant fields.
- Do not change build, runner or environment config without approval.

## Feature File Pattern

```gherkin
Feature: Create Order API

  Background:
    * url baseUrl
    * header Authorization = 'Bearer ' + authToken

  Scenario: Create order with valid payload
    Given path '/orders'
    And request { items: [{ sku: 'ABC', qty: 2 }] }
    When method post
    Then status 201
    And match response.id == '#notnull'
    And match response.status == 'pending'
    And match response.items == '#[1]'
```

## Reusable Features (call)

```gherkin
# login.feature (reusable)
Feature: Login
  Scenario:
    Given url baseUrl + '/auth/login'
    And request { email: '#(email)', password: '#(password)' }
    When method post
    Then status 200
    * def authToken = response.token
```

Call from other features: `* def login = call read('classpath:login.feature') { email: '...', password: '...' }`

## Data-Driven Testing

```gherkin
Scenario Outline: Validate order status transitions
  Given path '/orders/' + orderId + '/status'
  And request { status: '<newStatus>' }
  When method patch
  Then status <expectedCode>

  Examples:
    | newStatus  | expectedCode |
    | confirmed  | 200          |
    | invalid    | 400          |
    | shipped    | 200          |
```

## Embedded Expressions

- Use `#(variable)` for simple substitution.
- Use `#(expression)` for inline JavaScript evaluation.
- Use `karate.set()` for dynamic values across scenarios.
- Prefer JSON path matchers (`#notnull`, `#present`, `#[N]`, `#regex`) over custom assertions.

## Anti-Patterns to Avoid

- Complex JavaScript logic inside feature files — move to `karate-config.js` or Java helpers.
- Hardcoded base URLs — use `karate-config.js` with environment switching.
- Long scenario chains that depend on order — keep scenarios independent.
- Not using Background for shared setup.
- Ignoring response schema — always validate structure, not just status.

## Environment Configuration

- Use `karate-config.js` with `karate.env` for environment switching.
- Keep sensitive values (tokens, keys) in environment variables referenced via `karate.properties`.
- Never hardcode environment-specific values in feature files.

## Constraints

- Do not change `karate-config.js`, build files (pom.xml, build.gradle) or runner config without approval.
- Do not add Java dependencies without approval.
- Do not hardcode credentials or environment URLs in feature files.
- Keep features readable by non-developers (QA team members).
