# Test Management Diff Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Prepares the sync diff and remote snapshot based on the approved sync plan.

## Trigger

Activated as the governed Sync Diff sub-step (it is not part of the numbered main sequence in `qa-workflow-orchestrator.md`), after the sync plan is approved. Skipped if `testManagementSync.mode` is `"proposal-only"`.

## Inputs

- `.qa-ai/output/test-management-sync-plan.md` (approved sync plan from the test management sync planning phase).
- `.qa-ai/qa-ai.config.yaml` (`tools.testManagement`, `testManagementSync`).
- `.qa-ai/qa-ai.config.yaml` (`project.interfaceLanguage`) for user-facing wording.
- Connected test management MCP server/tooling.

## Responsibilities

- Capture the remote state snapshot from the external test management system via read-only MCP operations.
- Use the configured interface language (`project.interfaceLanguage`) for narrative notes and user-facing questions; preserve the documented table headers so validators remain deterministic.
- Save the captured snapshot to the configured snapshot path (default: `.qa-ai/output/test-management-remote-snapshot.md`), including a valid ISO-8601 Capture Timestamp and the current Run ID.
- Compare the captured remote snapshot with the approved sync plan to construct a deterministic diff.
- For each `create` action:
  - Generate a unique `idempotencyKey` that does not exist in the mapping file.
- For each `update` action:
  - Reference the correct mapped `externalId`.
- Write the constructed sync diff to the configured diff path (default: `.qa-ai/output/test-management-sync-diff.md`).
- Ensure no `delete` action is generated, as deletes are forbidden.

## Output

### 1 — Remote Snapshot (default: `.qa-ai/output/test-management-remote-snapshot.md`)

```markdown
# Test Management Remote Snapshot

- Tool: [testrail / zephyr / xray]
- Project: [project-name]
- Capture Timestamp: [ISO-8601 timestamp, e.g. 2026-06-18T08:30:00Z]
- Run ID: [run-id]

| External ID | Title                        | Section/Suite  | Status | Hash     |
| ----------- | ---------------------------- | -------------- | ------ | -------- |
| 12345       | Login with valid credentials | Authentication | Active | 9a8b7c6d |
```

### 2 — Sync Diff (default: `.qa-ai/output/test-management-sync-diff.md`)

```markdown
# Test Management Sync Diff

- Generated at: [ISO-8601 timestamp]
- Sync Mode: governed

| ID     | Action (create/update/skip) | External ID | Field changes                       | Idempotency key |
| ------ | --------------------------- | ----------- | ----------------------------------- | --------------- |
| TC-001 | create                      |             | Title: Login with valid credentials | idemp-tc-001    |
| TC-002 | update                      | 12345       | Title: New Login steps              |                 |
```

## Constraints

- Never perform external writes during the diff phase. All external calls must be strictly read-only.
- All generated idempotency keys must be completely unique and absent from the existing mapping file.
- Updates must map to valid existing external IDs in the mapping file.
- The snapshot timestamp must be newer than the sync plan approval time.

## Done Criteria

- The remote snapshot and proposed diff are internally consistent and validator-ready.
- Every action is traceable to a Test ID and approved sync-plan row.
- No external write has occurred.
