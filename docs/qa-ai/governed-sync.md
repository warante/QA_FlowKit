# Governed Test Management Sync

Governed sync is the controlled path for writing approved QA artifacts to a test management system such as TestRail,
Zephyr or Xray. It keeps the default workflow proposal-first, then adds explicit snapshot, diff, approval, apply and
verification phases when `testManagementSync.mode` is `governed`.

## Configuration

Enable governed sync in `qa-ai.config.yaml`:

```yaml
tools:
  testManagement: testrail

testManagementSync:
  mode: governed
  syncPlanPath: qa-ai-output/test-management-sync-plan.md
  diffPath: qa-ai-output/test-management-sync-diff.md
  remoteSnapshotPath: qa-ai-output/test-management-remote-snapshot.md
  applyLogPath: qa-ai-output/test-management-apply-log.md
  rollbackPlanPath: qa-ai-output/test-management-rollback-plan.md
```

`node .qa-ai/scripts/init.mjs` creates the governed templates when this mode is configured. `doctor` verifies that the required
scripts, agents and templates are present.

## Pipeline

The governed pipeline is:

```text
coverage analysis -> sync plan -> sync-diff -> approval gate -> sync-apply -> sync-verify
```

1. `test-management-sync-agent` writes `qa-ai-output/test-management-sync-plan.md` with proposed creates, updates and
   skips. It must not perform external writes.
2. A human approves the sync plan through the harness approval gate.
3. `test-management-diff-agent` reads the external system through read-only MCP/tooling, captures
   `qa-ai-output/test-management-remote-snapshot.md`, then writes `qa-ai-output/test-management-sync-diff.md`.
4. `validate-sync-diff.mjs` checks that every diff row is traceable to the approved plan, deletes are absent,
   `create` rows have fresh idempotency keys, `update` rows reference mapped external IDs and the snapshot is newer
   than the sync-plan approval event.
5. Before any write, the agent prepares `qa-ai-output/test-management-rollback-plan.md` from the approved diff and the
   pre-apply snapshot. `sync-apply` stays blocked until this file exists.
6. A scoped `external-write:test-management` approval unblocks `sync-apply`.
7. `test-management-apply-agent` applies only the approved diff and records `qa-ai-output/test-management-apply-log.md`
   after every action.
8. `test-management-verify-agent` captures post-apply evidence and `validate-sync-result.mjs` compares the apply log,
   rollback plan, mapping file and snapshots.

## Example Diff

```markdown
# Test Management Sync Diff

- Generated at: 2026-06-18T12:30:00Z
- Sync Mode: governed

| ID     | Action (create/update/skip) | External ID | Field changes                      | Idempotency key  |
| ------ | --------------------------- | ----------- | ---------------------------------- | ---------------- |
| TC-001 | create                      |             | Title: Login with valid credential | idemp-tc-001-new |
| TC-002 | update                      | C123        | Status: Active                     |                  |
| TC-003 | skip                        | C124        | No external change                 |                  |
```

Run the focused validator locally:

```bash
npx qa-flowkit validate-sync-diff --json
```

From this source repository, the equivalent script is:

```bash
npm run qa:validate-sync-diff -- --json
```

## Safety Rules

- Governed sync never stores credentials in repository files.
- `sync-diff` uses read-only external calls only.
- Deletes are forbidden.
- `sync-apply` is the only phase allowed to perform external writes, and only after the scoped approval gate is open.
- Idempotency keys prevent duplicate creates across retries.
- Rollback and verification artifacts are repository evidence, not secret storage.

## Rollback And Verification

Rollback plans are local evidence prepared before writes:

```markdown
# Test Management Rollback Plan

| ID     | Action | External ID | Rollback action | Rollback details                                  | Status  |
| ------ | ------ | ----------- | --------------- | ------------------------------------------------- | ------- |
| TC-001 | create |             | deactivate      | Deactivate case with idempotency key idemp-tc-001 | pending |
| TC-002 | update | C123        | restore         | Restore previous hash hash-old                    | pending |
```

Apply logs are append-style evidence written during execution:

```markdown
# Test Management Apply Log

| ID     | Action | External ID | Result (applied/failed/skipped) | Timestamp            |
| ------ | ------ | ----------- | ------------------------------- | -------------------- |
| TC-001 | create | C124        | applied                         | 2026-06-18T12:05:00Z |
```

After apply, capture a post-apply snapshot and run:

```bash
npx qa-flowkit validate-sync-result --json
```

`validate-sync-result` fails if an apply-log row is missing or extra, an applied case is absent from the post snapshot,
mapping fields are incomplete, or a failed row is not mirrored in the rollback plan status.
