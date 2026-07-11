# Test Management Rules

**Enforced by:** validate-sync-plan.mjs, validate-sync-diff.mjs, validate-sync-result.mjs, lib/test-management-mapping.mjs

Apply when analyzing coverage or drafting sync plans for TestRail, Zephyr, Xray or other tools configured in `tools.testManagement`.

## Scope

- `proposal-only` reads and analyzes exports, mappings and repository artifacts without external writes.
- `governed` may create or update cases only through approved connected tooling after every contract gate passes.
- Do not state that cases were synchronized unless the apply log and post-apply verification provide evidence.

## Before proposing cases

- Ask for target project, suite or folder when the configuration does not specify them.
- Search existing mapped cases and repository `.feature` files for duplicates and overlaps.
- Inform the user before proposing new sections or folders.

## Artifacts

- Coverage analysis: `.qa-ai/output/test-management-coverage-analysis.md` (or path from config).
- Sync plan: `.qa-ai/output/test-management-sync-plan.md` with proposal-first rows and approval status columns.
- Mapping file: use `.qa-ai/templates/test-management-mapping.template.json` shape when maintaining local mapping.

## Writes

- Create new case proposals only after user approval.
- Update or delete external cases only after explicit approval and only when configuration allows it.

## Governed Sync Mode

When `testManagementSync.mode` is set to `governed`:

- Follow the workflow: `coverage-analysis -> sync plan -> sync-diff -> approval gate -> sync-apply -> sync-verify`.
- Sync diff and snapshot are validated via `validate-sync-diff.mjs`.
- Writes to the external test management system are strictly governed:
  - Generate a rollback plan (`test-management-rollback-plan.md`) before starting the apply phase.
  - Request and record explicit user approval on the run gate `external-write:test-management` before applying the sync plan.
  - All write operations must be performed progressively (batch-by-batch) and stop immediately on first failure.
  - Deletes are strictly forbidden; only creates and updates are supported.
  - Write results to `test-management-apply-log.md` and verify the outcome using `validate-sync-result.mjs`.
  - Mapping entries must be populated with `externalId`, `idempotencyKey` (for creates), `lastAppliedAt` (ISO date), and `lastAppliedRunId` for successful writes.

## Validation

```bash
node .qa-ai/scripts/validate-sync-plan.mjs
node .qa-ai/scripts/validate-sync-result.mjs
```
