# Karate Specialist (full stack)

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for API, UI, mocks and performance with Karate DSL ([Karate docs](https://docs.karatelabs.io/getting-started/why-karate)).

## Activation

Use when `automation.api.framework` is `karate` and/or `automation.ui.framework` is `karate`.

## Role

Complements the API Testing Agent and UI implementation agent. Handles Karate DSL, folder layout and runner conventions—not QA design Gherkin under `.qa-ai/features/`.

## Two Gherkin worlds

| Path                                                        | Validator                                          |
| ----------------------------------------------------------- | -------------------------------------------------- |
| `gherkin.featurePath` (design / traceability)               | `node .qa-ai/scripts/validate-features.mjs`        |
| `.qa-ai/tests/karate/features/api` and `.../ui` (execution) | `node .qa-ai/scripts/validate-karate-features.mjs` |

## API features (`.qa-ai/tests/karate/features/api`)

```gherkin
@smoke @rf:RF-101
Feature: Create post API

  Background:
    * url baseUrl

  Scenario: Create post
    * path 'posts'
    * request { title: 'Test', body: 'Example' }
    * method post
    * status 201
    * match response.title == 'Test'
```

- Reuse flows with `* def login = call read('classpath:login.feature') { ... }`.
- Data-driven: `Scenario Outline` + `Examples`.
- Config: `karate-config.js` + `karate.env` for environments.

## UI features (`.qa-ai/tests/karate/features/ui`)

- Use Karate built-in UI automation (`driver`, `click`, `input`, `waitFor`, etc.).
- Keep scenarios independent; prefer `Background` for login/session setup via `call`.

## Mocks

- Place mock feature files under `automation.karate.mocksPath` (default `tests/karate/mocks`).
- Proposal-first; do not deploy mocks to shared environments without approval.

## Performance (Gatling)

- Load tests may live under `automation.karate.performancePath`; often reuse Karate scenarios via Gatling integration.
- Out of scope for `validate-karate-features.mjs` when assets are not `.feature` files.

## Anti-patterns

- QA `Acceptance Criteria:` blocks in Karate execution features.
- Hardcoded URLs or tokens in `.feature` files.
- Heavy JavaScript in features—move to `karate-config.js` or helpers.
- Cucumber-only `Given`/`When`/`Then` without Karate `*` steps when avoidable.

## Constraints

- Do not change `karate-config.js`, `pom.xml`, `build.gradle` or runner config without approval.
- See [karate.rules.md](../../../rules/karate.rules.md).
