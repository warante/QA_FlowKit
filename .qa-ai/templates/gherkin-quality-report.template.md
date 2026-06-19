# Gherkin Quality Report

- Rubric Version: 1
- Run ID: RUN-000
- RF ID: RF-000
- Evaluation Date: 2026-01-01T00:00:00Z

## Evaluated Files

| File                                              | Content hash       |
| ------------------------------------------------- | ------------------ |
| features/functional/RF-000-TC-001-example.feature | sha256-placeholder |

## File: features/functional/RF-000-TC-001-example.feature

| Dimension            | Criterion                                                                                      | Verdict (pass/fail) | Evidence (quoted line)               |
| -------------------- | ---------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------ |
| requirement-fidelity | The expected outcome matches a documented acceptance criterion.                                | pass                | `Then the outcome is visible`        |
| observability        | Each Then step names a visible UI, API, data, message, state or integration outcome.           | pass                | `Then the outcome is visible`        |
| atomicity            | The scenario focuses on one business behavior or rule.                                         | pass                | `Scenario: RF-000 TC-001 Example`    |
| determinism          | Environment assumptions are stated as Given steps or controlled test data.                     | pass                | `Given a controlled precondition`    |
| data-independence    | Variable data is expressed through examples, parameters or fixtures.                           | pass                | `Given a controlled precondition`    |
| ui-overspecification | The scenario describes user-visible intent rather than selector or DOM implementation details. | pass                | `When the user completes the action` |
| language-clarity     | Steps are readable by QA/product stakeholders without implementation jargon.                   | pass                | `Then the outcome is visible`        |

## Summary

| File                                              | Dimensions passed | Verdict |
| ------------------------------------------------- | ----------------- | ------- |
| features/functional/RF-000-TC-001-example.feature | 7                 | pass    |
