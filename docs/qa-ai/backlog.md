# Backlog

## Product status

The folder-copy MVP is complete and the first target-repository pilot has confirmed that the core workflow works correctly. QA FlowKit is now in target-repo hardening: public, CI-backed and usable, with current work focused on strict validation, pilot notes, guided examples and packaging.

## Epic 1 - Portable starter foundation

### TASK-001 - Create portable `.qa-ai` folder

Status: Done

Acceptance Criteria:

- `.qa-ai/agents` exists.
- `.qa-ai/workflows` exists.
- `.qa-ai/rules` exists.
- `.qa-ai/templates` exists.
- `.qa-ai/scripts` exists.
- `.qa-ai/presets` exists.
- `.qa-ai/adapters` exists.

### TASK-002 - Implement init script

Status: Done

Acceptance Criteria:

- Generates `qa-ai.config.yaml`.
- Creates QA output, features and configured test folders.
- Records optional `--qa-context` knowledge folders without interpreting them in Node.
- Keeps default init minimal: OpenCode adapter only, no starter QA document files unless requested.
- Does not overwrite files by default.
- Supports presets.
- Supports adapter generation and adapter selection.

### TASK-003 - Implement agent bootstrap script

Status: Done

Acceptance Criteria:

- Runs after only `.qa-ai/` has been copied.
- Copies Claude Code `/qa-init` into `.claude/commands/`.
- Copies OpenCode `/qa-init` into `.opencode/commands/`.
- Does not overwrite files by default.
- Supports `--agents`, `--agent` and `--force`.
- Records created files in the manifest.

### TASK-004 - Implement doctor script

Status: Done

Acceptance Criteria:

- Reports pass/warn/fail.
- Validates config, core folders and required framework assets.
- Validates configured QA output, features and tests paths.
- Validates configured QA context when `knowledge.enabled` is true.
- Warns for missing automation framework config files.

### TASK-005 - Implement feature validator

Status: Done

Acceptance Criteria:

- Detects missing Acceptance Criteria.
- Detects multiple scenarios per file.
- Detects missing required tags.
- Detects required tags without values.
- Detects missing RF ID in filename and Scenario title (Feature title may be clean; use `@rf:` for traceability).
- Requires `# language: es` for Spanish Gherkin files.

### TASK-006 - Implement clean script

Status: Done

Acceptance Criteria:

- Uses `.qa-ai/state/init-manifest.json`.
- Runs as dry-run by default.
- Deletes only tracked generated files and directories.
- Requires `--force` before deleting.
- Protects modified tracked files unless `--include-modified` is passed.
- Removes directories only when tracked and empty.

## Epic 2 - Agent compatibility

### TASK-007 - Add generic AGENTS.md

Status: Done

### TASK-008 - Add Claude adapter

Status: Done

### TASK-009 - Add adapters for other tools

Status: Done

Supported adapters:

- Codex
- OpenCode
- Cline
- Continue
- Aider
- Goose
- Gemini CLI

Slash command support:

- Claude Code includes `/qa-init`, `/qa-full-flow`, `/qa-doctor`, `/qa-clean` and `/qa-validate-features`.
- OpenCode includes `/qa-init`, `/qa-full-flow`, `/qa-doctor`, `/qa-clean` and `/qa-validate-features`.
- Root bootstrap commands are provided for agent-first initialization before full adapter sync.
- Slash commands are guided by default and ask for required context when called without arguments.

## Epic 3 - QA workflow artifacts

### TASK-010 - Add templates for workflow artifacts

Status: Done

Templates exist for requirement analysis, test management coverage, test design proposal, automation feasibility, automation implementation, traceability, test management sync, issue task drafts and PR summaries.

### TASK-011 - Add QA rules

Status: Done

Rules exist for approval, Gherkin, test management, automation, UI automation and API testing.

### TASK-011A - Add optional QA context intake

Status: Done

Acceptance Criteria:

- `init.mjs` supports one repo-local `--qa-context` folder.
- Presets include disabled `knowledge` defaults.
- Claude Code and OpenCode `/qa-init` read QA context before proposing defaults.
- `.qa-ai/agents/qa-context-intake-agent.md` exists.
- `.qa-ai/workflows/context-intake.md` exists.
- Future agents read QA context summary and decisions when enabled.

## Epic 4 - Open-source readiness

### TASK-012 - Add public GitHub documents

Status: Done

Acceptance Criteria:

- LICENSE exists.
- CONTRIBUTING.md exists.
- CODE_OF_CONDUCT.md exists.
- SECURITY.md exists.
- README.md is complete for MVP use.
- ROADMAP.md is complete.

## Epic 5 - Stronger validators

### TASK-013 - Add stronger local validators

Status: Done

Acceptance Criteria:

- Feature validation parses Gherkin structure line-by-line.
- Feature validation detects duplicate explicit test case IDs.
- Traceability validation checks feature identifiers against the configured matrix.
- Sync plan validation keeps test-management sync proposal-first and approval-gated.
- Active specialist validation checks `.qa-ai/agents/specialists/active.md` against `qa-ai.config.yaml`.
- CI runs the stronger validators with source-repo-safe empty/missing allowances.

### TASK-014 - Add strict target repository validation

Status: Done

Acceptance Criteria:

- `doctor --strict` fails when configured target artifacts are missing.
- Strict mode documents source-repo vs target-repo expectations.
- Strict mode can be used in target repository CI.
- Strict mode checks that required QA workflow artifacts exist once generated by a real flow.
- Strict mode distinguishes warnings for optional adapters from failures for required configured assets.

### TASK-015 - Document first pilot findings

Status: Done

Acceptance Criteria:

- Capture what worked in the first target repository pilot.
- Capture friction points and improvement ideas without exposing private repository details.
- Add migration notes that help the next adopter run init, doctor, feature validation and traceability validation.
- Link the notes from README or the guided examples documentation.

Delivered: `docs/qa-ai/pilot-findings.md`. Linked from README (EN/ES).

### TASK-016 - Strengthen traceability matrix validation

Status: Done

Acceptance Criteria:

- Validate that `traceability-matrix.md` contains a Markdown table.
- Require the configured traceability table columns from the template.
- Detect malformed rows, empty rows and rows without RF/test identifiers.
- Detect duplicate test case identifiers across matrix rows.
- Detect duplicate feature file entries across matrix rows.
- Preserve `--allow-empty` and `--allow-missing` behavior for source-repo CI.

### TASK-017 - Strengthen test-management sync plan validation

Status: Done

Acceptance Criteria:

- Validate that sync plans contain a Markdown table of proposed actions.
- Require minimum columns: `ID`, `Proposed action`, `Approval status`.
- Detect malformed rows, empty rows and rows without RF/test identifiers.
- Detect duplicate identifiers across sync plan rows.
- Detect language that claims external writes already happened.
- Require proposal-first and approval-gated language.
- Preserve `--allow-empty` and `--allow-missing` behavior for source-repo CI.

### TASK-018 - Extract shared Markdown table validation utilities

Status: Done

Acceptance Criteria:

- Add shared Markdown table parsing helpers under `.qa-ai/scripts/lib/`.
- Reuse the shared parser from traceability validation.
- Reuse the shared parser from sync-plan validation.
- Preserve current validator behavior and smoke coverage.

### TASK-019 - Add native Node tests for shared validators

Status: Done

Acceptance Criteria:

- Add dependency-free tests using `node:assert/strict`.
- Cover valid Markdown table parsing.
- Cover missing separator rows.
- Cover missing required columns.
- Cover malformed row cell counts.
- Cover empty rows.
- Include the tests in `validate:oss-extraction`.

### TASK-020 - Strengthen test-management mapping validation

Status: Done

Acceptance Criteria:

- Keep an empty mapping object `{}` valid for new repositories.
- Validate that non-empty mapping entries are keyed by RF/test IDs or `.feature` paths.
- Require each mapping entry value to be an object.
- Validate supported fields: `externalId`, `section`, `suite`, `status`, `lastReviewedAt`, `notes`.
- Detect duplicate `externalId` values.
- Detect secret-like field names or values.
- Cover the helper with native Node tests and sync-plan smoke tests.

### TASK-021 - Add documented test-management mapping template

Status: Done

Acceptance Criteria:

- Add a JSON template documenting valid mapping shape.
- Keep generated target mapping files empty by default.
- Validate the template with native Node tests.
- Include the template in doctor required template checks.
- Document allowed fields and secret-handling expectations in README.

### TASK-022 - Align adapter validation guidance with hardened validators

Status: Done

Acceptance Criteria:

- Update Claude Code command guidance for hardened target-repository validation.
- Update OpenCode command guidance with matching validation recommendations.
- Update Codex and generic adapter docs to mention strict doctor and full validators.
- Keep source-repo maintainer validation pointed at `npm run validate:oss-extraction`.

### TASK-023 - Add target repository validation command

Status: Done

Acceptance Criteria:

- Add `validate-target.mjs` to run strict doctor and target validators in order.
- Support `--allow-empty`, `--allow-missing` and `--no-strict-doctor` for incomplete repositories.
- Add an npm script for target validation.
- Include the command in doctor checks.
- Cover success and failure paths in smoke tests.
- Update adapter guidance to prefer the aggregated command.

## Epic 6 - Guided examples and public docs

### TASK-024 - Add getting-started flows by user type

Status: Done

Acceptance Criteria:

- Add `docs/qa-ai/getting-started.md` with step-by-step flows for Manual QA, Automation QA, Agent-First and Maintainer profiles.
- Each flow includes prerequisites, exact commands, expected output and next steps.
- Link the document from the Documentation table in `README.md` and `README.es.md`.

### TASK-025 - Add troubleshooting guide

Status: Done

Acceptance Criteria:

- Cover common failures for init, doctor, feature validation, traceability validation and CI.
- Include expected error messages and resolution steps.
- Link from README and getting-started.

### TASK-026 - Add terminal transcripts for common workflows

Status: Done

Acceptance Criteria:

- Short terminal transcripts or screenshots for: default init, manual-only init, agent-first bootstrap, validate-features and validate-target.
- Transcripts embedded or linked from getting-started or a dedicated examples page.

## Epic 7 - Intelligent guidance (BMAD-inspired)

### TASK-028 - Add qa-help and qa-next-steps library

Status: Done

Acceptance Criteria:

- Add `qa-next-steps.mjs` with track-aware phase inspection and prioritized recommendations.
- Add `qa-help.mjs` CLI with `--json` support.
- Add `npm run qa:help`.

### TASK-029 - Add QA workflow tracks

Status: Done

Acceptance Criteria:

- Add `project.qaTrack` to presets (`quick` for manual-only, `standard` for automation presets).
- Support `init.mjs --qa-track`.
- Document track skips in orchestrator and `full-flow.md`.

### TASK-030 - Add /qa-help adapter commands

Status: Done

Acceptance Criteria:

- Add `qa-help.md` for Claude Code and OpenCode adapters.
- Update `qa-status` and `qa-full-flow` to reference `qa-help`.
- Add `docs/qa-ai/qa-help.md` and link from README.

## Epic 8 - Quality gates (BMAD-inspired)

### TASK-031 - Add release gate artifact and validator

Status: Done

Acceptance Criteria:

- Add `release-gate.template.yaml` and `validate-release-gate.mjs`.
- Support decisions PASS, CONCERNS, FAIL, WAIVED and PENDING (draft).
- Validate evidence paths exist and WAIVED requires approver plus waived_reason.

### TASK-032 - Integrate release gate with enterprise track

Status: Done

Acceptance Criteria:

- Add `release-gate-agent.md`, `release-gate.md` workflow and `/qa-gate` adapter commands.
- Include release gate validation in `validate-target.mjs` for `enterprise` track.
- Extend `qa-help` enterprise phase list with `release-gate`.

### TASK-027 - Add example manual-only repository

Status: Done

Acceptance Criteria:

- Public repository with manual-only preset, feature files, traceability matrix and QA context folder.
- Passes `validate-target.mjs` in CI.
- Linked from README and getting-started.

Progress: [`examples/manual-only/`](../../examples/manual-only/) is now the first-class in-repo reference. Its E2E
installs the locally packed package, preserves the reviewed artifacts and runs strict target validation on the
supported CI matrix.

## Epic 9 - Test design dual-mode (BMAD TEA-inspired)

### TASK-033 - Add system and per-RF test design artifacts

Status: Done

Acceptance Criteria:

- Add `test-design-system.template.md` and extend `test-design-proposal.template.md` for per-RF scope.
- Add `test-design-system-agent.md` and `test-design-system.md` workflow.
- Add `testDesign.systemPath` and `testDesign.proposalPath` to presets.
- Generate system template with `init.mjs --with-doc-templates`.

### TASK-034 - Add test design validation and qa-help phases

Status: Done

Acceptance Criteria:

- Add `lib/test-design.mjs` and `validate-test-design.mjs` with `npm run qa:validate-test-design`.
- Add `test-design-system` and `test-design-rf` phases to `qa-next-steps.mjs` for standard and enterprise tracks.
- Include test design validation in `validate-target.mjs` for standard and enterprise tracks.
- Add `docs/qa-ai/test-design-dual-mode.md` and link from README files.

## Epic 10 - Repository-native agent harness

Design: [user guide](agent-harness.md) and [technical architecture](agent-harness-architecture.md).

### TASK-035 - Add the shared workflow contract

Status: Done

Acceptance Criteria:

- Add `.qa-ai/contracts/workflow.v1.json`.
- Move phase order, guidance, outputs, validators and approval requirements into the contract.
- Make `qa-next-steps.mjs` consume the shared contract without changing current `qa-help` behavior.
- Reject unknown fields, unsafe paths, executable commands and unknown validator IDs.
- Validate the contract from `doctor.mjs` and source-repository CI.

### TASK-036 - Add persistent run state

Status: Done

Depends on: TASK-035.

Acceptance Criteria:

- Store run snapshots and append-only events under `.qa-ai/state/runs/<run-id>/`.
- Support atomic writes and an exclusive state mutation lock.
- Record phase transitions, approvals, validator results and artifact hashes.
- Never store secrets, prompts, model reasoning or artifact contents.
- Preserve run state through `qa-flowkit update`.

### TASK-037 - Add the harness CLI and phase packets

Status: Done

Depends on: TASK-035, TASK-036.

Acceptance Criteria:

- Add `qa-run.mjs` with `start`, `status`, `next`, `check`, `set-rf`, `approve` and `resume`.
- Expose it as `npx qa-flowkit run`.
- Support human output and `--json` for status and phase packets.
- Build minimal phase packets from config, rules, phase guidance, specialists and prior artifacts.
- Keep existing commands functional when no run exists.

### TASK-038 - Add validation and approval control

Status: Done

Depends on: TASK-037.

Acceptance Criteria:

- Execute validators only through a fixed internal allowlist.
- Do not advance a phase when inputs, outputs, approval or validation are missing.
- Keep failed phases active for bounded retries, then mark them blocked.
- Deny external writes and deletes in every shipped phase contract.
- Redact secret-like validator diagnostics before persisting events.

### TASK-039 - Integrate harness guidance

Status: Done

Depends on: TASK-037, TASK-038.

Acceptance Criteria:

- Make `qa-help` prioritize the active run before stateless artifact inference.
- Update Claude, OpenCode, Codex and generic adapters to use `run next` and `run check`.
- Keep `/qa-full-flow`, `/qa-help` and direct validator commands backward compatible.
- Document that shell access can bypass compatible-mode policies; MCP enforcement remains deferred.

### TASK-040 - Add harness regression coverage

Status: Done

Depends on: TASK-035 through TASK-039.

Acceptance Criteria:

- Add native Node tests for contract parsing, transitions, approvals, retries, locking and path safety.
- Add CLI integration tests for start/resume and JSON output.
- Extend smoke and npm-pack tests for packaged harness files.
- Cover quick, standard and enterprise tracks in fixtures.
- Run the full repository validation suite successfully.

## Epic 11 - Agent harness hardening

These tasks close defects found during the post-implementation review of Epic 10.

### TASK-041 - Enforce repository path isolation at runtime

Status: Done

Priority: P1.

Acceptance Criteria:

- Resolve every config-derived harness input, output, feature root, release gate and hash target with
  `resolveRepoPath`.
- Reject absolute paths and paths that escape the repository before filesystem access.
- Apply the same path resolution to existence checks, output hashing and validator targets.
- Add regression tests proving `../outside`, absolute paths and unsafe `$config.*` values are rejected.

### TASK-042 - Enforce modification approvals

Status: Done

Priority: P1.

Acceptance Criteria:

- Detect whether a phase output existed before the phase was activated.
- When `permissions.modifyExisting` is `approval`, block completion of modified pre-existing outputs until a
  scoped approval is recorded.
- Do not require modification approval for newly created outputs.
- Include the required approval gate in the phase packet and event log.
- Add tests for new output, unchanged existing output, modified existing output and approved modification.

### TASK-043 - Make blocked validation phases recoverable

Status: Done

Priority: P1.

Acceptance Criteria:

- A phase blocked after the validation-attempt limit can be retried after the user corrects its artifacts.
- Add an explicit `run retry` or `run unblock` transition; do not silently clear blocked state.
- Record the transition and reset or increment attempts according to one documented policy.
- Approval and missing-RF blockers must keep their current explicit resolution flows.
- Add CLI and controller tests covering failure, block, correction, retry and successful completion.

### TASK-044 - Correct command failure and JSON contracts

Status: Done

Priority: P2.

Acceptance Criteria:

- `doctor` exits non-zero when workflow-contract validation fails.
- `validate-workflow-contract --json` prints JSON only, without a human-readable header.
- Every harness command documented with `--json` produces parseable JSON on success.
- Machine-readable errors use stderr and a non-zero exit code without corrupting stdout JSON.
- Add CLI regression tests for invalid contracts and JSON parsing.

### TASK-045 - Align harness documentation and backlog state

Status: Done

Priority: P3.

Acceptance Criteria:

- Replace remaining “planned commands/files” wording for implemented MVP behavior.
- Clearly label the harness as implemented but under hardening until TASK-041 through TASK-044 pass.
- Update ROADMAP, user guide, architecture and Epic 10 statuses consistently.
- Preserve MCP/tool-gateway and external writes as deferred work.

### TASK-046 - Close harness regression gaps

Status: Done

Depends on: TASK-041 through TASK-045.

Acceptance Criteria:

- Add tests for unsafe config paths, modification approvals, blocked-phase recovery, invalid-doctor exit code and
  pure JSON output.
- Test real lock contention with two concurrent mutation attempts, not only uncontended lock acquisition.
- Verify run state survives `qa-flowkit update`, including an actual run directory and active pointer.
- Ensure npm-pack smoke tests exercise at least one complete recoverable harness flow.
- Run lint, format check, `validate:oss-extraction`, npm pack verification, `git diff --check` and local link checks.

## Epic 12 - Agent harness review follow-up

These tasks close defects found during the second post-implementation review.

### TASK-047 - Capture baselines for entry-blocked phases

Status: Done

Priority: P1.

Acceptance Criteria:

- Capture the modification baseline exactly once when a phase is first selected, even when entry blockers prevent
  activation.
- Preserve that baseline when RF or approval gates later unblock the phase.
- Detect and block unapproved changes to pre-existing outputs after unblocking.
- Add a regression test covering a Gherkin phase initially blocked by RF and approval requirements.

### TASK-048 - Make phase packets modification-aware and idempotent

Status: Done

Priority: P2.

Acceptance Criteria:

- Compare current output hashes with the stored baseline before adding a modification-approval blocker.
- Do not report a blocker for unchanged pre-existing outputs.
- Make repeated `run next`, `run status` and `run resume` calls produce consistent phase state and blockers.
- Add tests for repeated commands with unchanged and modified pre-existing outputs.

### TASK-049 - Generate collision-resistant run IDs

Status: Done

Priority: P2.

Acceptance Criteria:

- Allow two runs for the same RF to start within the same second without an ID collision.
- Keep run IDs readable, filesystem-safe and sortable by creation time.
- Preserve compatibility when loading existing run IDs and active-run pointers.
- Add a deterministic regression test that starts two same-RF runs with the same second-level timestamp.

### TASK-050 - Validate and close the harness follow-up

Status: Done

Depends on: TASK-047 through TASK-049.

Acceptance Criteria:

- Add focused controller and CLI regressions for every Epic 12 defect.
- Confirm modification approval still works for normally activated phases and newly created outputs.
- Update harness documentation only where externally observable behavior changed.
- Mark TASK-042, TASK-046 and TASK-047 through TASK-050 Done only after all acceptance criteria pass.
- Run lint, format check, `validate:oss-extraction`, npm pack verification, `git diff --check` and local link checks.

## Future planning

This backlog records the implementation history through Epic 12. The executable plan from the current beta to stable
`1.0.0` continues in [`tasks/README.md`](../../tasks/README.md), beginning with Epic 13.

Post-1.0 candidates remain:

- MCP/tool gateway and read-only integrations.
- Controlled external writes after permission, audit, idempotency and rollback design.
- Interactive init.
- Adapter registry.
- Documentation site enhancements.
