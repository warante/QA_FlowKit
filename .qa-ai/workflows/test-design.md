# Test Design Workflow

Generate Gherkin tests from approved requirement analysis in the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).

## Rules

- Do not generate final tests until the official RF ID is known.
- Create one `.feature` file per test case.
- Include exactly one configured scenario keyword per file: `Scenario:` / `Scenario Outline:` for English or `Escenario:` / `Esquema del escenario:` for Spanish.
- Include the configured acceptance criteria label in every file: `Acceptance Criteria:` for English or `Criterios de aceptación:` for Spanish.
- Include `# language: es` in Spanish `.feature` files.
- Include required tag values from `qa-ai.config.yaml`; the default tags are `@priority:`, `@type:` and `@manual:`.
- Manual tests must also have `.feature` files.
- Do not generate unit tests.

## Output

- Proposal: `docs/qa/test-design-proposal.md`
- Feature files: configured `gherkin.featurePath`, usually `features/`

Run `node .qa-ai/scripts/validate-features.mjs` after generating or changing `.feature` files.
