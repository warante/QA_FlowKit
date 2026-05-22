# TestRail Sync Workflow

Produce a TestRail sync plan. Do not write externally in the MVP.

## Inputs

- Target TestRail project.
- Approved `.feature` files.
- Existing case search results when available.
- Traceability matrix.

## Output

Update `docs/qa/testrail-sync-plan.md` with:

- Sections to create.
- New cases to create.
- Existing cases to keep.
- Existing cases requiring changes.
- Potential duplicates or overlaps.
- Cases requiring user decision.

Any future TestRail write integration must be approval-gated and proposal-first.
