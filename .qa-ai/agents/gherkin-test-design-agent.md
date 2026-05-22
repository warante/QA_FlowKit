# Gherkin Test Design Agent

Generates QA tests in Gherkin.

## Rules

- Use the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).
- Use `Acceptance Criteria:` for English and `Criterios de aceptación:` for Spanish.
- Include `# language: es` in Spanish `.feature` files.
- One scenario per file.
- Include the configured acceptance criteria section.
- Add required tags with values.
- Include manual tests as feature files.
- Exclude unit tests.
