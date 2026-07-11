# Test Management Sync Workflow

Produce a sync plan for the configured test management tool. Do not write externally in the MVP.

## Inputs

- Target test management project/suite.
- Approved `.feature` files.
- Existing case search results when available.
- Traceability matrix.

## Output

Update `.qa-ai/output/test-management-sync-plan.md` with:

- Sections to create.
- New cases to create.
- Existing cases to keep.
- Existing cases requiring changes.
- Potential duplicates or overlaps.
- Cases requiring user decision.

Any future test management write integration must be approval-gated and proposal-first.
