# Epic 17 - Contract Stability and Migration

**Status:** In progress
**Milestone:** M4
**Accountable:** Engineering lead
**Contributors:** CLI/framework engineer, QA automation engineer, technical writer, release engineer

## Objective

Define and freeze the public contracts that adopters can rely on in `1.0.0`, with automated compatibility and migration
coverage from supported beta releases.

## TASK-068 - Inventory and classify public contracts

**Owner:** Engineering lead
**Depends on:** Epic 13; revisit deferred Epic 16 findings before the `1.0.0` release freeze

**Status:** Done

Subtasks:

- Inventory CLI commands, flags, exit codes and JSON output.
- Inventory `qa-ai.config.yaml`, preset and workflow contract schemas.
- Inventory generated paths, state/event formats, adapter file locations and validator rules.
- Mark each item stable, experimental, internal or deprecated.
- Define backward-compatibility and deprecation policy.

Documentation:

- Expand stability policy with a 1.0 contract table.
- Link each stable contract to canonical reference documentation.

Acceptance:

- No user-visible contract remains unclassified.

Implementation evidence:

- Human-readable inventory and deprecation policy: `docs/qa-ai/public-contracts.md`.
- Machine-readable inventory: `.qa-ai/contracts/public-contracts.v1.json`.
- Drift validator: `.github/scripts/verify-public-contracts.mjs`.
- CI/local command: `npm run contracts:check`, included in `validate:oss-extraction`.
- Validation passed: `npm run contracts:check`, `npm run lint`, `npm run format:check`,
  `npm run validate:oss-extraction` and `node .github/scripts/verify-npm-pack.mjs`.
- Deferred pilot findings remain a release-freeze review input and do not block this baseline inventory.

## TASK-069 - Add machine-readable schema and compatibility fixtures

**Owner:** CLI/framework engineer
**Depends on:** TASK-068

Subtasks:

- Version config, workflow and run-state schemas explicitly.
- Add representative fixtures for the oldest supported beta and current beta.
- Validate unknown, deprecated and incompatible fields with actionable errors.
- Preserve runtime dependency policy unless a dependency is justified by measurable reliability.

Tests:

- Unit tests for schema upgrades, unknown versions and deprecated fields.
- Snapshot/contract tests for JSON CLI outputs and exit codes.

CI:

- Add compatibility fixture validation to the OS/Node matrix.

Documentation:

- Document schema versions, compatibility guarantees and extension points.

Acceptance:

- Supported old fixtures load or migrate; unsupported versions fail with a migration message.

## TASK-070 - Implement and test beta-to-1.0 migration

**Owner:** CLI/framework engineer
**Depends on:** TASK-069

Subtasks:

- Define the oldest supported beta upgrade source.
- Build migration fixtures containing custom config, generated artifacts, adapters and active run state.
- Ensure `update` preserves user-owned paths, state, profiles and edits according to policy.
- Add dry-run or preflight reporting for destructive/incompatible changes.
- Define rollback instructions and backup expectations.

Tests and E2E:

- Implement E2E-05 on Ubuntu and Windows.
- Verify repeated update is idempotent.
- Verify interrupted update recovery where feasible.

Documentation:

- Publish the beta-to-1.0 migration guide and troubleshooting.
- Update release checklist and README upgrade section.

Acceptance:

- Migration passes from every supported fixture without silent data loss.

## TASK-071 - Freeze CLI and validator behavior

**Owner:** Engineering lead
**Depends on:** TASK-068 through TASK-070

Subtasks:

- Resolve inconsistent command aliases, defaults and error contracts.
- Define validator strict/non-strict semantics for 1.0.
- Ensure machine-readable output remains pure JSON.
- Document deterministic ordering where consumers may parse output.
- Add deprecation warnings before removing any beta behavior.

Tests:

- Golden tests for help, errors, exit codes and JSON.
- Regression coverage for all previously fixed harness defects.
- Fuzz/property tests for path handling and config parsing where practical.

Documentation:

- Update CLI reference, validator reference, troubleshooting and stability policy.

Acceptance:

- No planned breaking contract change remains after the freeze date.

## TASK-072 - Complete packaging and clean-install reliability

**Owner:** Release engineer
**Depends on:** TASK-071

Subtasks:

- Verify package allowlist and required files for every command.
- Run packed tarball tests without source-repository fallbacks.
- Test paths containing spaces and non-ASCII user directory names.
- Verify offline/folder-copy fallback for documented scenarios.

Tests and CI:

- Implement E2E-06 on Ubuntu and Windows.
- Ensure release workflow uses the same pack verification.

Documentation:

- Update npm CLI contract and installation troubleshooting.

Acceptance:

- Every primary command works from an installed tarball in a clean directory.

## Epic exit criteria

- M4 contract freeze is approved by engineering, product and QA.
- E2E-05 and E2E-06 pass.
- Migration documentation has been followed successfully by someone other than its author.
