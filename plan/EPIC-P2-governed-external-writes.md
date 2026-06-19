# EPIC-P2 - Governed external writes (test management and issue trackers)

Goal: evolve test-management integration from proposal-only to a governed
`read -> proposal -> approval -> diff -> apply -> verify` pipeline. Architectural stance: QA
FlowKit does **not** ship API clients. The agent performs reads and writes through the host's MCP
servers (Atlassian official remote MCP, TestRail MCP, Xray/Zephyr REST via MCP or user tooling);
QA FlowKit governs the process with deterministic artifacts, approval gates recorded in the run
state, idempotency keys and post-apply verification.

Exit gate: on a repository with an enterprise or standard track and a connected test-management
MCP, a user can approve a sync plan, have the agent apply exactly the approved batch, and get a
deterministic verification that the remote state matches the approved plan - with every step
recorded in the run event log and a rollback plan generated before any write.

Naming note: existing `testrail-*` agents/templates are tool-specific names for tool-agnostic
behavior (config supports `testrail|zephyr|xray|none`). This epic renames them generically.

---

## P2-US-01 - Tool-agnostic naming and sync contract

As a user of Zephyr or Xray, I want the framework artifacts and agents to be named and specified
independently of TestRail so that the workflow reads correctly for my tool.

### P2-T-001 - Rename testrail-specific agents, templates and artifacts to test-management generics

Status: Done
Priority: P2
Depends on: none

Description: rename `testrail-coverage-agent.md`, `testrail-sync-agent.md`,
`testrail-sync-plan.template.md` and related artifact names to `test-management-*`, keeping
backward-compatible aliases for existing targets.

Implementation notes:

- Rename files under `.qa-ai/agents/` and `.qa-ai/templates/` from `testrail-*` to
  `test-management-*`; update every reference (workflows, rules, adapter commands, validators,
  `qa-next-steps.mjs`, workflow contract, docs).
- Default generated artifact path becomes `qa-ai-output/test-management-sync-plan.md`; the
  validator and harness accept the legacy `testrail-sync-plan.md` path when it exists (alias table
  in one shared module, with a doctor warning suggesting rename).
- The `testrail:` config block remains (it is tool-specific by nature) but docs clarify the
  generic agents read whichever tool block `tools.testManagement` selects.
- `update` flow must not break existing targets: legacy filenames keep validating (regression
  test with a fixture using old names).

Acceptance criteria:

- [x] No file under `.qa-ai/agents/` or `.qa-ai/templates/` is named `testrail-*` (the config
      block and tool-specific specialist `.qa-ai/agents/specialists/available/testrail.md` are
      exempt).
- [x] `grep -r "testrail-sync-agent\|testrail-coverage-agent" .qa-ai/ .claude/ .opencode/ docs/`
      returns no hits outside a migration note.
- [x] A fixture target using the legacy `testrail-sync-plan.md` path passes `validate-target` with
      a doctor warning recommending the new name.
- [x] Workflow contract references the new artifact names; `npm run qa:validate-contract` passes.
- [x] Docs updated (`docs/qa-ai/workflow.md`, `docs/qa-ai/config-schema.md`, README EN/ES where
      the old names appeared).
- [x] Global Definition of Done passes.

### P2-T-002 - Extend the workflow contract and mapping file for governed sync

Status: Done
Priority: P1
Depends on: P2-T-001

Description: add the data foundations: new contract phases (`sync-diff`, `sync-apply`,
`sync-verify`) gated behind config, and idempotency fields in the test-management mapping file.

Implementation notes:

- Extend `.qa-ai/contracts/workflow.v1.json` additively: three new optional phases, present only
  when config enables them (see new config below). `sync-apply` declares
  `permissions.externalWrites: approval` - the first phase to do so; the contract validator and
  `harness-contract.mjs` must support this value (current contract denies external writes
  everywhere; keep `deny` the default for all other phases).
- New config keys (schema + presets + docs, default off):

  ```yaml
  testManagementSync:
    mode: proposal-only # proposal-only | governed
    diffPath: qa-ai-output/test-management-sync-diff.md
    applyLogPath: qa-ai-output/test-management-apply-log.md
    rollbackPath: qa-ai-output/test-management-rollback-plan.md
    remoteSnapshotPath: qa-ai-output/test-management-remote-snapshot.md
  ```

- Extend the mapping file schema (`.qa-ai/scripts/lib/` mapping helper + template): per-entry
  optional fields `idempotencyKey` (string, unique), `lastAppliedAt` (ISO date),
  `lastAppliedRunId` (string). Duplicate `idempotencyKey` values are a validation error. Secret
  scanning continues to apply.
- Harness: when `mode: governed` and the track includes the phases, `run next` sequences
  `coverage-analysis -> sync plan -> sync-diff -> approval gate -> sync-apply -> sync-verify`.
  Approval for `sync-apply` is a distinct gate id `external-write:test-management` and must be
  recorded via `run approve`; the event log records the gate, the plan file hash at approval time,
  and refuses `sync-apply` completion if the plan hash changed after approval (re-approval
  required).

Acceptance criteria:

- [x] `npm run qa:validate-contract` passes with the new phases; a contract declaring
      `externalWrites: approval` on any phase other than `sync-apply` fails validation (test).
- [x] With `mode: proposal-only` (default), harness behavior is byte-identical to today
      (regression: existing harness tests pass unmodified).
- [x] With `mode: governed` on an enterprise fixture, `run status --json` lists the three new
      phases; `run check` on `sync-apply` without the recorded `external-write:test-management`
      approval reports the approval blocker (with humanized text per P0-T-007).
- [x] Modifying the sync plan file after approval invalidates the approval: `run check` blocks and
      the event log contains a `approval_invalidated` event (new event type, documented).
- [x] Mapping entries with duplicate `idempotencyKey` fail mapping validation with the key named.
- [x] `docs/qa-ai/config-schema.md`, `docs/qa-ai/workflow.md` and
      `docs/qa-ai/agent-harness.md` document the new mode, phases, gate and events.
- [x] Global Definition of Done passes.

---

## P2-US-02 - Proposal to apply pipeline

As a QA lead, I want the agent to show me exactly what will change in my test-management tool, let
me approve it, apply only that, and prove afterwards that it did, so that I get automation speed
with audit-grade control.

### P2-T-003 - Specify and validate the remote snapshot and diff artifacts

Status: Done
Priority: P1
Depends on: P2-T-002

Description: define the deterministic formats for (a) the remote-state snapshot the agent captures
via MCP reads and (b) the diff between snapshot and approved plan; implement
`validate-sync-diff.mjs`.

Implementation notes:

- Templates: `test-management-remote-snapshot.template.md` (header with tool, project, capture
  timestamp, run id; one Markdown table: `External ID | Title | Section/Suite | Status | Hash`)
  and `test-management-sync-diff.template.md` (header; one table:
  `ID | Action (create/update/skip) | External ID | Field changes | Idempotency key`), both under
  `.qa-ai/templates/` and registered in doctor template checks.
- New agent `.qa-ai/agents/test-management-diff-agent.md` (bilingual interaction): instructs the
  agent to read remote state through the user's MCP tooling (never credentials in files), write
  the snapshot, then compute the diff strictly from snapshot + approved sync plan; every `create`
  gets a fresh `idempotencyKey`, every `update` references the existing mapping `externalId`.
- `validate-sync-diff.mjs` (CLI, `--json`, `--allow-missing`): uses the shared Markdown-table
  helpers; checks: tables parse with required columns; every diff row's ID exists in the approved
  sync plan; no diff action is `delete` (deletes remain unsupported); every `create` row has an
  idempotency key absent from the mapping file; every `update` row's external ID exists in the
  mapping; the snapshot header timestamp parses ISO-8601 and is newer than the sync plan file's
  recorded approval event. Wire into `validate-target.mjs` when `mode: governed`, npm script
  `qa:validate-sync-diff`, harness validator allowlist entry for the `sync-diff` phase.

Acceptance criteria:

- [x] Valid fixture snapshot + diff pass `node .qa-ai/scripts/validate-sync-diff.mjs`; each listed
      violation type has a failing fixture and test (missing column, unknown plan ID, delete
      action, duplicate/absent idempotency key, unknown external ID, stale snapshot).
- [x] `--json` emits machine-readable findings; exit codes follow the existing validator
      convention.
- [x] Templates exist, are doctor-checked, and `init --with-doc-templates` generates them when
      `mode: governed`.
- [x] Harness `run check` on the `sync-diff` phase executes the validator through the allowlist.
- [x] The diff agent file exists, is bilingual-aware, and is referenced from the workflow contract
      phase guidance.
- [x] Docs: new page `docs/qa-ai/governed-sync.md` describing the full pipeline with an example,
      linked from README tables (EN/ES).
- [x] Global Definition of Done passes.

### P2-T-004 - Specify and validate the rollback plan and apply log; verify after apply

Status: Done
Priority: P1
Depends on: P2-T-003

Description: before any write the agent must produce a rollback plan; during apply it must produce
an apply log; after apply it must capture a fresh snapshot that a new validator
(`validate-sync-result.mjs`) compares against the approved diff.

Implementation notes:

- Templates: `test-management-rollback-plan.template.md` (per diff row: inverse action and the
  data needed to perform it; `create` -> "delete or deactivate <idempotencyKey>", `update` ->
  previous field values from the snapshot) and `test-management-apply-log.template.md` (per row:
  `ID | Action | External ID | Result (applied/failed/skipped) | Timestamp`).
- `validate-sync-result.mjs`: inputs are approved diff, apply log, pre-apply snapshot and
  post-apply snapshot (the agent captures the second snapshot in `sync-verify`). Checks: every
  diff row appears in the apply log exactly once; no apply-log row exists without a diff row;
  every `applied` create/update is reflected in the post-apply snapshot (external ID present /
  field hash changed as declared); every `failed` row is mirrored in an updated rollback plan
  status; mapping file updated: applied creates have `externalId`, `idempotencyKey`,
  `lastAppliedAt`, `lastAppliedRunId` filled. Wire into harness `sync-verify` phase, npm script,
  `validate-target.mjs` under governed mode.
- Rollback plan is a required input of the `sync-apply` phase in the contract (apply cannot start
  without it); the harness enforces input presence as it does for other phases.
- New agent `.qa-ai/agents/test-management-apply-agent.md`: instructs MCP-mediated writes batch by
  batch, stop-on-first-failure default, never exceeding the approved diff, recording the log after
  every action; explicit instruction that deletes are forbidden and that credentials never enter
  artifacts (secret scanner runs on all new artifacts - extend its target list).
- Update `.qa-ai/rules/test-management.rules.md`: governed mode section, approval-then-apply
  semantics, forbidden actions. Update approval rules to name the new gate.

Acceptance criteria:

- [x] `sync-apply` cannot activate without an existing, validated rollback plan (harness test).
- [x] `validate-sync-result.mjs` passes on a coherent fixture set and fails (with named row) on
      each of: missing apply-log row, extra apply-log row, applied-but-absent-in-snapshot,
      unfilled mapping fields, failed row without rollback status. `--json` supported.
- [x] Secret scanning covers the four new artifact paths (test: a fake token in the apply log is
      detected).
- [x] End-to-end harness test (fixture, no real MCP): a governed run advances
      plan -> diff -> approve -> apply -> verify with agent work simulated by writing fixture
      artifacts, and the event log contains the approval, apply-start and verify events in order.
- [x] `docs/qa-ai/governed-sync.md` documents rollback and verification with examples;
      `SECURITY.md` gains a paragraph on the external-write boundary (writes only via user-approved
      host MCP, never via FlowKit code).
- [x] Global Definition of Done passes.

---

## P2-US-03 - Read-only external intake

As a QA engineer, I want to import requirements from Jira and existing cases from my
test-management tool into workflow artifacts so that coverage analysis starts from reality instead
of copy-paste.

### P2-T-005 - Add external intake artifacts, agent and validator

Status: Done
Priority: P2
Depends on: P2-T-001

Description: define a deterministic intake artifact for externally sourced requirements/cases
(captured by the agent via MCP reads), validate it, and feed it into coverage analysis.

Implementation notes:

- Config (schema + docs, default off):

  ```yaml
  sources:
    external:
      enabled: false
      requirementsImportPath: qa-ai-output/imported-requirements.md
      casesImportPath: qa-ai-output/imported-cases.md
  ```

- Templates: `imported-requirements.template.md` (table: `RF ID | External key | Title | Source |
Imported at | Content hash`; body sections per RF with description and acceptance criteria
  quoted as untrusted content) and `imported-cases.template.md` (table: `External ID | Title |
Section | Status | Imported at`).
- New agent `.qa-ai/agents/external-intake-agent.md` (bilingual): read via MCP, never write
  externally, normalize external keys to RF IDs per `requirements.requireOfficialRfId`, mark
  inferred fields, and treat imported text per `.qa-ai/rules/untrusted-content.rules.md`
  (P0-T-008) - the injection scanner runs on both import artifacts.
- `validate-external-intake.mjs`: table shape, unique RF/external IDs, ISO timestamps, RF IDs
  matching the configured pattern, untrusted-content scan executed (reuse
  `injection-patterns.mjs`; findings are warnings). Wire into `validate-target.mjs` when enabled;
  npm script; optional `external-intake` phase in the contract before `coverage-analysis` for
  standard/enterprise tracks when enabled.
- Coverage-analysis agent guidance updated to consume `imported-cases.md` when present (avoid
  proposing cases that already exist remotely).

Acceptance criteria:

- [x] Valid import fixtures pass; duplicate RF ID, malformed timestamp and bad RF pattern each
      fail with the row named; `--json` supported.
- [x] An imported requirement containing an injection phrase yields a warning finding referencing
      `untrusted-content.rules.md`.
- [x] With `sources.external.enabled: true`, `run status --json` on a standard-track fixture shows
      the `external-intake` phase before `coverage-analysis`; with the default config the phase is
      absent and existing harness tests pass unmodified.
- [x] Templates doctor-checked; agent file referenced from contract phase guidance; coverage agent
      references the import artifact.
- [x] Docs: section in `docs/qa-ai/governed-sync.md` (or new `docs/qa-ai/external-intake.md`)
      linked from README tables (EN/ES); `docs/qa-ai/config-schema.md` updated.
- [x] Global Definition of Done passes.
