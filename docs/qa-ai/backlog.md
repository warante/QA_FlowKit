# Backlog

## MVP status

The folder-copy MVP is implemented. Remaining work is additional parser-backed validation, examples and packaging.

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

## Future epics

- Parser-backed Gherkin validation.
- Traceability matrix validation.
- Duplicate RF/test ID validation.
- Dry-run test management sync plan validation.
- CI validation workflow.
- Example repositories.
- npm CLI migration.
- MCP read-only integration.
- Documentation site.
