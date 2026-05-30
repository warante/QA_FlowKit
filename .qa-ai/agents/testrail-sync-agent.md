# Test Management Sync Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Prepares synchronization plans between local features and the configured test management tool.

## Trigger

Activated as Phase 8 of the QA workflow, after coverage analysis is complete. Skipped if `tools.testManagement` is `none` or missing.

## Inputs

- [.qa-ai/rules/test-management.rules.md](../rules/test-management.rules.md) (proposal-first sync).
- `qa-ai-output/testrail-coverage-analysis.md` (output of Phase 7).
- Generated `.feature` files in `features/`.
- `qa-ai.config.yaml` (`tools.testManagement`, `tools.testManagementProject`).
- `.qa-ai/agents/specialists/active.md` to load test management specialist.

## Responsibilities

- Create a concrete synchronization plan: what to create, update or skip.
- Propose section/folder structure in the test management tool.
- Map feature file content to test case fields (title, preconditions, steps, expected results).
- Handle conflicts between local features and existing remote cases.
- Prioritize sync order (new high-priority cases first).
- Ask approval before any planned external writes.

## Output

Produce the configured sync plan artifact (default: `qa-ai-output/testrail-sync-plan.md`):

```markdown
# Test Management Sync Plan

## Summary

- **Tool**: [TestRail / Zephyr / etc.]
- **Target project/suite**: [name]
- **Actions planned**: Create [N], Update [N], Skip [N]

## Section Structure (Proposed)
```

[Suite Name]/
├── RF-042 Login/
│ ├── TC: Login valid credentials
│ ├── TC: Login invalid credentials
│ └── TC: Account lockout
├── RF-015 Shopping Cart/
│ └── TC: Update cart quantity

```

## Sync Actions

### Create (New Cases)
| Feature File | Proposed Title | Section | Priority |
|---|---|---|---|
| RF-042-login-invalid.feature | Login with invalid credentials | RF-042 Login | High |

### Update (Existing Cases)
| Existing Case | Feature File | Changes | Reason |
|---|---|---|---|
| TC-1234 | RF-042-login-valid.feature | Update steps 3-5 | New validation added |

### Skip (No Action Needed)
| Existing Case | Feature File | Reason |
|---|---|---|
| TC-1235 | RF-042-login-lockout.feature | Already in sync |

## Conflict Resolution
| Case | Local Version | Remote Version | Recommendation |
|---|---|---|---|
| TC-1234 | Updated steps | Original steps | Update remote (local is source of truth) |

## Execution Order
1. Create sections/folders first
2. Create new cases (high priority first)
3. Update existing cases
4. Verify sync completeness
```

## Done Criteria

Phase is complete when:

- Every gap from coverage analysis has a "Create" action.
- Every outdated existing case has an "Update" action.
- Conflicts are identified with resolution recommendations.
- The sync plan is written and ready for user review.

## Error Handling

- **Coverage analysis missing**: Cannot proceed without Phase 7 output. Report to orchestrator.
- **Section structure unclear**: Propose a structure based on RF grouping and ask approval.
- **Too many conflicts**: Group by type and ask user for bulk resolution strategy.

## Constraints

- Do not write to external test management tools in the MVP.
- Produce the plan only; execution requires explicit user approval and future integration.
- Do not delete or archive remote cases without explicit request.
- Ask approval before marking any planned external writes.
