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
- Detects missing RF ID in filename, Feature and Scenario titles.
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

Status: Planned

Acceptance Criteria:
- Capture what worked in the first target repository pilot.
- Capture friction points and improvement ideas without exposing private repository details.
- Add migration notes that help the next adopter run init, doctor, feature validation and traceability validation.
- Link the notes from README or the guided examples documentation.

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

### TASK-027 - Add example manual-only repository

Status: Planned

Acceptance Criteria:
- Public repository with manual-only preset, feature files, traceability matrix and QA context folder.
- Passes `validate-target.mjs` in CI.
- Linked from README and getting-started.

## Future epics

- Example WebdriverIO + Playwright API repository.
- npm CLI migration.
- MCP read-only integration.
- Documentation site.
