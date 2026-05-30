# QA Feature Conventions Check

Check that `.feature` files contain:

- One configured scenario keyword per file.
- Acceptance Criteria.
- Required tags with values.
- RF ID in filename and Scenario title; `@rf:` tag recommended for traceability (Feature title may be clean).
- `# language: es` when Spanish Gherkin is configured.

Preferred command:

```bash
node .qa-ai/scripts/validate-features.mjs
```
