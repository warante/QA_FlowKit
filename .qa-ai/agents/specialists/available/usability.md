# Usability Specialist

> Guidance for task success, learnability and error-prevention design. Not a substitute for formal UX research sign-off.

## Activation

Load when normalized source NFRs use `usability`, or when requirements mention ease of use, learnability, task
completion or user-error prevention without a measurable oracle.

## Focus

- User profile, task, success criterion and evaluation method (heuristic review, moderated session, benchmark task).
- Prefer `manual-charter` or `technical-review` when behavior is subjective.
- Record open questions when “easy to use” lacks a testable success condition.

## Output

- Add `## Non-functional coverage` rows with Evidence type `manual-charter` or `technical-review`.
- Do not convert vague usability language into precise Gherkin without user confirmation.

## Safety Boundaries

- Do not claim representative user research coverage from a single exploratory session.
- Do not store personal data from usability sessions in repository artifacts.
