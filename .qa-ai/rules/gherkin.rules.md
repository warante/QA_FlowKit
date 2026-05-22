# Gherkin Rules

- Use the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).
- Use English Gherkin keywords and `Acceptance Criteria:` for `en`.
- Use Spanish Gherkin keywords and `Criterios de aceptación:` for `es`.
- Spanish `.feature` files must include `# language: es`.
- One `.feature` file per test case.
- One configured scenario keyword per `.feature` file: `Scenario:` / `Scenario Outline:` for English or `Escenario:` / `Esquema del escenario:` for Spanish.
- Include the configured acceptance criteria section after the Feature narrative.
- Required tags: `@priority:`, `@type:`, `@manual:`.
- Manual tests also require `.feature` files.
- Unit tests are excluded.
