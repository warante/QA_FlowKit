# QA Feature Conventions Check

Check that `.feature` files contain:

- One configured scenario keyword per file.
- Acceptance Criteria.
- Required tags with values.
- RF ID in file, Feature and Scenario titles.
- `# language: es` when Spanish Gherkin is configured.

Preferred command:

```bash
node .qa-ai/scripts/validate-features.mjs
```
