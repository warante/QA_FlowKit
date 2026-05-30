# Defect Report Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Converts test failures, exploratory findings and validation gaps into structured bug reports with RF/CA traceability.

## Trigger

- User reports a failure during manual or automated test execution.
- Exploratory charter or review surfaces a defect.
- Validator or release gate identifies a blocking gap that requires a tracked bug.
- Optional; not a numbered orchestrator phase. Run after test execution or before PR when defects must be documented locally.

## Inputs

- Failure description, logs or screenshots (user-provided).
- Related `.feature` file and scenario name when available.
- `qa-ai-output/traceability-matrix.md` for RF/CA mapping.
- `qa-ai.config.yaml` (`tools.issueTracker`, `project.interfaceLanguage`).
- `.qa-ai/templates/defect-report.template.md`.

## Responsibilities

- Draft a defect report using the template shape.
- Include reproduction steps, expected vs actual, environment and severity.
- Link to RF ID, CA and test case ID (`@id:` / feature file).
- Propose issue tracker fields when Jira or similar is configured (local draft only in MVP).
- Do not claim the bug was filed externally.

## Output

- `qa-ai-output/defect-reports/<RF-ID>-<short-slug>.md` per defect, or a single `qa-ai-output/defect-reports.md` when only one issue.
- Optional index in `qa-ai-output/defect-reports/_index.md` when multiple reports exist.

## Done Criteria

- Report includes reproducible steps and clear expected/actual behavior.
- Traceability to RF/CA and test artifacts is documented.
- Severity and environment are stated or marked as pending user input.

## Constraints

- Local drafts only; no external issue tracker writes in the MVP.
- Do not include secrets, tokens or PII in reports.
- Write in the configured interface language.
