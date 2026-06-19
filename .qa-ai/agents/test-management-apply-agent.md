# Test Management Apply Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Applies approved sync plans batch by batch using connected MCP servers/tooling and verifies results.

## Trigger

Activated as:

- Phase 10 (Sync Apply) of the QA workflow in governed mode, after the sync plan is approved and the rollback plan exists.
- Phase 11 (Sync Verify) of the QA workflow to capture a post-apply snapshot.

Skipped if `testManagementSync.mode` is `"proposal-only"`.

## Inputs

- `qa-ai-output/test-management-sync-diff.md` (approved sync diff from Phase 9).
- `qa-ai-output/test-management-rollback-plan.md` (rollback plan generated before apply).
- `qa-ai.config.yaml` (`tools.testManagement`, `testManagementSync`).
- Connected test management MCP server/tooling.

## Responsibilities

### Phase 10 — Sync Apply

1. Read the approved sync diff (`qa-ai-output/test-management-sync-diff.md`) and pre-apply snapshot.
2. If the rollback plan is missing, create it from the approved diff and pre-apply snapshot before attempting any external write, then stop for validation/approval.
3. Perform only the approved creates or updates to the external test management system through the user-approved MCP server/tooling.
4. Execute operations **batch by batch**.
5. **Stop-on-first-failure**: If any write operation fails, stop execution immediately.
6. Write the results of the apply step progressively to the apply log (`qa-ai-output/test-management-apply-log.md`). Mark failed operations as `failed` and propagate `failed` status to the rollback plan's corresponding row.
7. Fill out the mapping file (`qa-ai-output/test-management-mapping.json`) for successful operations with newly assigned external IDs, idempotency keys, ISO-8601 timestamps (`lastAppliedAt`), and active `lastAppliedRunId`.

### Phase 11 — Sync Verify

1. Capture a fresh post-apply snapshot of the remote state via MCP reads.
2. Save it to the post-apply snapshot path (default: `qa-ai-output/test-management-remote-snapshot.post.md`).

## Outputs

### 1 — Rollback Plan (default: `qa-ai-output/test-management-rollback-plan.md`)

```markdown
# Test Management Rollback Plan

- Run ID: [run-id]
- Sync Mode: governed

| ID     | Action | External ID | Rollback action | Rollback details                                   | Status  |
| ------ | ------ | ----------- | --------------- | -------------------------------------------------- | ------- |
| TC-001 | create |             | deactivate      | Deactivate case with idempotency key: idemp-tc-001 | pending |
```

### 2 — Apply Log (default: `qa-ai-output/test-management-apply-log.md`)

```markdown
# Test Management Apply Log

- Run ID: [run-id]
- Sync Mode: governed
- Applied at: [ISO-8601 timestamp]

| ID     | Action | External ID | Result (applied/failed/skipped) | Timestamp            |
| ------ | ------ | ----------- | ------------------------------- | -------------------- |
| TC-001 | create | 12346       | applied                         | 2026-06-18T00:01:00Z |
```

## Constraints

- Never perform any writes that exceed the approved sync diff.
- Do not perform any external write while the phase packet still reports missing rollback-plan inputs or approval blockers.
- Never write credentials, tokens, or passwords to files.
- `delete` actions on the external test management system are strictly forbidden during sync apply.
- If a write fails, stop immediately, log the failure, and mark its status as `failed` in the rollback plan.
