# Test Management Coverage Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Analyzes existing coverage in the configured test management tool and identifies gaps.

## Trigger

Activated as Phase 7 of the QA workflow, after Gherkin test design is complete. Skipped if `tools.testManagement` is `none` or missing.

## Inputs

- [.qa-ai/rules/test-management.rules.md](../rules/test-management.rules.md) (proposal-first sync).
- Generated `.feature` files in `features/` (output of Phase 6).
- `qa-ai.config.yaml` (`tools.testManagement`, `tools.testManagementProject`).
- `.qa-ai/agents/specialists/active.md` to load test management specialist.
- Existing test management data (when accessible locally or provided by user).
- `qa-ai-output/imported-cases.md` when `sources.external.enabled` is true — check this file first
  to avoid proposing new cases that already exist in the remote test management tool. Cases listed
  there are already tracked externally.

## Responsibilities

- Ask for the target test management project/suite when not configured.
- Compare generated features against existing test cases in the management tool.
- Search for existing tests by RF ID, title keywords and acceptance criteria matching.
- Detect duplicates (tests that already cover the same CA).
- Detect overlaps (tests that partially cover the same flows).
- Identify coverage gaps (CAs without any existing test case).
- Produce coverage metrics for **functional** acceptance criteria only.
- Report NFR coverage separately from CA/test-case metrics using `## Non-functional traceability` and
  `## Non-functional coverage`; do not propose syncing load plans, technical reviews or charters as external test cases
  unless the user explicitly requests artifact export.

## Output

Produce the configured coverage analysis artifact (default: `qa-ai-output/test-management-coverage-analysis.md`):

```markdown
# Test Management Coverage Analysis

## Summary

- **Tool**: [TestRail / Zephyr / qTest / etc.]
- **Project/Suite**: [name]
- **Total CAs analyzed**: [N]
- **Already covered**: [N] ([%])
- **Gaps (not covered)**: [N] ([%])
- **Duplicates detected**: [N]
- **Overlaps detected**: [N]

## Coverage Matrix

| RF     | CA   | Generated Feature            | Existing Case    | Status    |
| ------ | ---- | ---------------------------- | ---------------- | --------- |
| RF-042 | CA-1 | RF-042-login-valid.feature   | TC-1234          | Covered   |
| RF-042 | CA-2 | RF-042-login-invalid.feature | —                | Gap       |
| RF-042 | CA-3 | RF-042-login-lockout.feature | TC-1235, TC-1240 | Duplicate |

## Gaps (New Tests Needed)

| RF     | CA   | Generated Feature            | Priority |
| ------ | ---- | ---------------------------- | -------- |
| RF-042 | CA-2 | RF-042-login-invalid.feature | high     |

## Duplicates

| Existing Cases   | Overlap                   | Recommendation                      |
| ---------------- | ------------------------- | ----------------------------------- |
| TC-1235, TC-1240 | Both test account lockout | Merge into TC-1235, archive TC-1240 |

## Coverage Metrics

- Overall coverage: [N]%
- High-priority coverage: [N]%
- Regression suite coverage: [N]%
```

## Done Criteria

Phase is complete when:

- Every generated feature has been compared against existing test cases.
- Gaps, duplicates and overlaps are identified and documented.
- Coverage metrics are calculated.
- The artifact has been written.

## Error Handling

- **Test management tool not accessible**: Ask user to provide an export or list of existing test cases. Produce analysis based on available data.
- **No existing tests found**: Report 100% gaps (all generated features are new). This is normal for new projects.
- **Project/suite unknown**: Ask user before proceeding.

## Constraints

- Do not modify external test management tools in the MVP.
- Do not delete or archive test cases without explicit approval.
- Read-only analysis: observe and report, never mutate.
