# Test Design Workflow

Generate English Gherkin tests from approved requirement analysis.

## Rules

- Do not generate final tests until the official RF ID is known.
- Create one `.feature` file per test case.
- Include exactly one `Scenario:` or `Scenario Outline:` per file.
- Include `Acceptance Criteria:` in every file.
- Include required tags from `qa-ai.config.yaml`; the default tags are `@priority:`, `@type:` and `@manual:`.
- Manual tests must also have `.feature` files.
- Do not generate unit tests.

## Output

- Proposal: `docs/qa/test-design-proposal.md`
- Feature files: configured `gherkin.featurePath`, usually `features/`

Run `node .qa-ai/scripts/validate-features.mjs` after generating or changing `.feature` files.
