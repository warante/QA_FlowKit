# PR Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Prepares a PR-ready summary of all QA workflow outputs for review and merge.

## Trigger

Activated as Phase 13 of the QA workflow, after all implementation and planning phases are complete (before the enterprise release gate in Phase 14).

## Inputs

- All artifacts in `qa-ai-output/`.
- Generated `.feature` files in `features/`.
- Generated test code in `tests/` (when implementation was performed).
- `qa-ai.config.yaml` for project context.
- Git diff of all changes made during the workflow.

## Responsibilities

- Summarize all changes made during the workflow run.
- Include full traceability: which RFs were addressed, which CAs are covered.
- List all generated/modified artifacts with their purpose.
- Document risks and known limitations.
- Include manual test execution requirements for tests not automated.
- Provide a pre-merge checklist.
- Do not open a PR automatically unless the user explicitly asks and tooling is available.

## Output

Produce `qa-ai-output/pr-summary.md`:

```markdown
# QA Workflow PR Summary

## Overview

- **RF(s) addressed**: [RF-IDs]
- **Total test scenarios**: [N]
- **Automated**: [N] | **Manual**: [N] | **Pending**: [N]

## Changes Included

### Feature Files (Gherkin)

| File                          | Scenario                  | Type       | Status |
| ----------------------------- | ------------------------- | ---------- | ------ |
| features/RF-042-login.feature | Login invalid credentials | functional | New    |

### Automation Code

| File                                | Purpose       | Framework   |
| ----------------------------------- | ------------- | ----------- |
| tests/ui/specs/RF-042-login.spec.js | UI login test | WebdriverIO |

### Artifacts

| File                                          | Purpose                    |
| --------------------------------------------- | -------------------------- |
| qa-ai-output/requirement-analysis.md          | Extracted requirements     |
| qa-ai-output/normalized-requirements.md       | Testable criteria          |
| qa-ai-output/automation-feasibility-report.md | Feasibility classification |

## Traceability Matrix

| RF     | CAs Covered      | Features | Automated | Manual |
| ------ | ---------------- | -------- | --------- | ------ |
| RF-042 | CA-1, CA-2, CA-3 | 3        | 2         | 1      |

## Risks and Limitations

- [Known gaps in coverage]
- [Tests that depend on pending infrastructure]
- [Assumptions made during generation]

## Manual Execution Required

- [Feature file]: [Reason it requires manual execution]

## Pre-Merge Checklist

- [ ] Feature files pass Gherkin lint
- [ ] Automated tests pass locally (or are correctly marked as pending)
- [ ] No hardcoded credentials or environment-specific values
- [ ] RF IDs are official (no RF-PENDING remaining)
- [ ] Traceability is complete (every CA has a test)
- [ ] Test management sync plan reviewed (if applicable)

## Next Steps

- [Actions remaining after merge: CI setup, test environment provisioning, etc.]
```

## Done Criteria

Phase is complete when:

- The PR summary is written with all sections populated.
- Traceability matrix accounts for all RFs processed in this workflow run.
- Risks and manual requirements are documented.
- Checklist reflects actual state of deliverables.

## Error Handling

- **Incomplete workflow (phases skipped)**: Document which phases were skipped and why. Adjust checklist accordingly.
- **No implementation was done**: Focus summary on feature files and feasibility report. Note implementation is pending.
- **Git not available**: Summarize based on artifact files rather than diff.

## Constraints

- Do not open a PR automatically in MVP unless the user explicitly asks and tooling is available.
- Do not include sensitive data (tokens, credentials) in the summary.
- Write summary in the configured interface language.
