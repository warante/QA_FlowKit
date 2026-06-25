# Beta to 1.0 migration guide

This guide covers upgrading a target repository from the oldest supported beta line (`0.5.0-beta.0`) to the current
QA FlowKit package while preserving configuration, harness state, generated artifacts and adapter customizations.

## Scope

| Preserved by `update`                 | Not replaced unless you pass `--force` to a destructive init     |
| ------------------------------------- | ---------------------------------------------------------------- |
| `.qa-ai/state/` including active runs | `qa-ai.config.yaml`                                              |
| `.qa-ai/config-profiles/`             | `features/`, `tests/`, automation code                           |
| User edits under `qa-ai-output/`      | Root adapter files such as `AGENTS.md`, `.claude/`, `.opencode/` |

`update` **does** replace the packaged framework payload under `.qa-ai/` (scripts, contracts, agents, rules, presets,
templates and packaged adapters). Obsolete files that existed only inside `.qa-ai/` before the update are removed.

## Recommended upgrade path

```bash
# 1. Review the plan without changing files
npx qa-flowkit@beta update --dry-run
npx qa-flowkit@beta update --dry-run --json

# 2. Back up user-owned data
#    qa-ai.config.yaml, .qa-ai/state/, .qa-ai/config-profiles/, features/, qa-ai-output/

# 3. Apply the update from the installed package
npx qa-flowkit@beta update

# 4. Verify the target repository
npx qa-flowkit doctor --strict
npx qa-flowkit validate-config
npx qa-flowkit validate-target
npx qa-flowkit run status --json
```

Pin CI to the same channel you test locally:

| Channel | Install / update                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------ |
| `beta`  | `npx qa-flowkit@beta` (current default on `main`)                                                |
| `rc`    | `npx qa-flowkit@rc` (after TASK-080 publish; see [beta-to-rc-release.md](beta-to-rc-release.md)) |
| stable  | `npx qa-flowkit@latest` (Epic 20 / `1.0.0` only)                                                 |

Example for RC soak:

```bash
npx qa-flowkit@rc update --dry-run
npx qa-flowkit@rc update
npx qa-flowkit@rc doctor --strict
```

Scheduled example checks: run the **Example compatibility** workflow with channel `rc` after the first RC ships.

## Configuration migration

### Legacy requirement keys

Oldest supported beta configs may still use:

```yaml
requirements:
  allowInferredAcceptanceCriteria: true
  requireApprovalForInferredCriteria: true
```

The runtime normalizes those keys to `requirements.inferredAcceptanceCriteria` when they agree. `update` does **not**
rewrite `qa-ai.config.yaml` automatically. When convenient, replace the legacy pair with the modern enum:

| Legacy pair                                                                           | Modern value                                   |
| ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `allowInferredAcceptanceCriteria: false`                                              | `inferredAcceptanceCriteria: forbid`           |
| `allowInferredAcceptanceCriteria: true` + `requireApprovalForInferredCriteria: true`  | `inferredAcceptanceCriteria: require-approval` |
| `allowInferredAcceptanceCriteria: true` + `requireApprovalForInferredCriteria: false` | `inferredAcceptanceCriteria: allow`            |

If both legacy and modern keys are present with conflicting values, `doctor` and `validate-config` fail until you resolve
the mismatch.

### Unsupported schema versions

Configurations with `version: 2` or harness snapshots with unsupported `schemaVersion` values fail validation with a
migration message. See [schema-compatibility.md](schema-compatibility.md).

## Harness state

Active and historical runs under `.qa-ai/state/runs/` are preserved across `update`. After upgrading:

1. Run `npx qa-flowkit run status --json` to confirm the active run id and phase.
2. Resume with `run next`, `run check`, or `run resume` as documented in [agent-harness.md](agent-harness.md).

Completed runs remain immutable.

## Adapters

`update` refreshes detected root adapters from packaged templates **without overwriting** existing files unless you pass
`--force`. Review adapter diffs when upgrading across major beta milestones.

## Rollback expectations

`update` backs up `.qa-ai/state/` and `.qa-ai/config-profiles/` to a temporary directory while replacing the framework
folder. If the command fails after the framework folder is removed:

1. Restore `.qa-ai/state/` and `.qa-ai/config-profiles/` from your backup.
2. Reinstall the previous `qa-flowkit` package version.
3. Run `npx qa-flowkit update` again after the repository is consistent.

There is no automatic git rollback. Use your repository backup or VCS workflow.

## Verification evidence

The source repository validates the oldest-supported-beta fixture with:

```bash
npm run test:e2e-update-migration
npm run test:update-migration
```

Fixture location: [`test/fixtures/migration/oldest-supported-beta/`](../../test/fixtures/migration/oldest-supported-beta/).

## Related documents

- [Schema compatibility](schema-compatibility.md)
- [CLI reference — update](cli-reference.md#update)
- [Troubleshooting — update failures](troubleshooting.md#update-and-migration-failures)
- [Public contracts](public-contracts.md)
