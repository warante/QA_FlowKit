# Schema compatibility

Versioned machine-readable contracts and representative beta fixtures for QA FlowKit.

## Registry

The schema registry is [`.qa-ai/contracts/schema-registry.v1.json`](../../.qa-ai/contracts/schema-registry.v1.json). It maps each public surface to:

- the current schema version;
- supported versions for compatibility checks;
- the schema file path;
- the migration guide anchor for unsupported versions.

## Surfaces

| Surface       | Version field   | Schema file                    | Notes                                                                    |
| ------------- | --------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Configuration | `version`       | `config.v1.schema.json`        | Parsed from `qa-ai.config.yaml`                                          |
| Workflow      | `schemaVersion` | `workflow.v1.schema.json`      | Structural contract; path and validator semantics are checked separately |
| Run state     | `schemaVersion` | `run-state.v1.schema.json`     | `.qa-ai/state/runs/<run-id>/run.json`                                    |
| Run events    | per-line JSON   | `run-event.v1.schema.json`     | `.qa-ai/state/runs/<run-id>/events.jsonl`                                |
| Init manifest | `version`       | `init-manifest.v1.schema.json` | `.qa-ai/state/init-manifest.json`                                        |

Unsupported versions must fail with an actionable migration message that references this document.

## Configuration

### Current beta

The current beta contract is `version: 1` with the top-level sections documented in [config-schema.md](config-schema.md).

### Oldest supported beta

The oldest supported beta upgrade source for the `0.5.x` line is `0.5.0-beta.0`. Configurations may still use the legacy requirement keys:

- `requirements.allowInferredAcceptanceCriteria`
- `requirements.requireApprovalForInferredCriteria`

`doctor`, `validate-config` and compatibility validation normalize those keys to `requirements.inferredAcceptanceCriteria` when they agree. Conflicting legacy and modern values fail validation.

### Unsupported examples

- `version: 2` fails with a migration message.
- Unknown top-level keys fail schema validation (`additionalProperties: false`).

## Workflow

Workflow contracts use `schemaVersion: 1`. The shipped contract is [`.qa-ai/contracts/workflow.v1.json`](../../.qa-ai/contracts/workflow.v1.json). Structural validation covers required phase fields and permissions; repository path safety and validator names are enforced by `validate-workflow-contract.mjs`.

## Run state

Harness snapshots use `schemaVersion: 1` and preserve:

- run identity and track;
- per-phase status, attempts and validation metadata;
- approvals and timestamps.

Consumers should prefer CLI JSON output (`npx qa-flowkit run status --json`) instead of parsing state files directly. Beta-to-1.0 migration behavior is documented in [beta-to-1.0-migration.md](beta-to-1.0-migration.md) and validated by `npm run test:e2e-update-migration`.

## Init manifest

Cleanup manifests use `version: 1` with sorted `entries` describing generated files and directories. The manifest is experimental but preserved across `update`.

## Compatibility fixtures

Representative fixtures live in [`test/fixtures/compatibility/`](../../test/fixtures/compatibility/). The inventory is [`manifest.v1.json`](../../test/fixtures/compatibility/manifest.v1.json).

Verification:

```bash
npm run test:compatibility-fixtures
node --test .github/scripts/test-compatibility-fixtures.mjs
```

Both commands run in `npm run validate:oss-extraction`.

## Extension points

- New **optional** config keys may be added to `config.v1.schema.json` with safe defaults.
- New **experimental** workflow phases require contract inventory updates and compatibility review.
- A future `version: 2` or `schemaVersion: 2` requires a migration guide section and fixtures before release.

See also [public-contracts.md](public-contracts.md) and [stability-policy.md](stability-policy.md).
