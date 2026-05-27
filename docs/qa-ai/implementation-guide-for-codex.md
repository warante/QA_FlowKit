# Implementation Guide for Codex Desktop

This document tells a Codex Desktop agent how to implement the QA FlowKit project from beginning to end.

## Role

You are the implementation agent for an open-source QA AI workflow starter. You must create a portable folder-based framework that can be copied into any QA/automation repository and later migrated to an npm CLI.

## Non-negotiable requirements

1. The first version is folder-copy based, not npm-based.
2. The project must be open-source ready.
3. The project must be compatible with multiple AI coding CLIs.
4. `AGENTS.md` is the generic compatibility layer.
5. Claude Code receives a `.claude/` adapter.
6. OpenCode receives a lightweight `.opencode/` adapter where supported.
7. Codex receives `AGENTS.md` and `.codex/` documentation.
8. Cline receives `.clinerules` and optional `.cline/` documentation.
9. Continue receives `.continue/` rules/checks where applicable.
10. Aider receives `.aider.conf.yml` plus documentation.
11. Goose receives a recipe file.
12. Gemini CLI receives `GEMINI.md` project context.
13. Optional QA context folders are interpreted by agents, while `init.mjs` only validates and records the approved repo-local path.
14. All destructive or external write actions must be proposal-first and approval-gated.
15. The starter must not require real external tool credentials in the MVP.
16. Specialist agents live under `.qa-ai/agents/specialists/available/`; `init.mjs` generates `.qa-ai/agents/specialists/active.md` from config.
17. Generated test cases must be written in the configured Gherkin language: English (`en`) or Spanish (`es`).
18. Manual tests must also have `.feature` files.
19. Unit tests are out of scope.
20. Agent-first initialization uses `/qa-init`, not `/init`, to avoid overriding native agent commands.
21. Claude Code bootstrap commands live in `.claude/commands/`.
22. OpenCode bootstrap commands live in `.opencode/commands/`.

## Target project structure

Create or maintain this structure:

```text
qa-flowkit/
  README.md
  LICENSE
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  SECURITY.md
  ROADMAP.md
  CHANGELOG.md
  AGENTS.md
  docs/qa-ai/
  .qa-ai/
```

The `.qa-ai/` folder is the portable framework.

## Implementation order

### Step 1 - Review existing files

Inspect:

- `README.md`
- `ROADMAP.md`
- `docs/qa-ai/backlog.md`
- `.qa-ai/scripts/`
- `.qa-ai/templates/`
- `.qa-ai/agents/`
- `.qa-ai/adapters/`

### Step 2 - Implement or improve scripts

Required scripts:

- `.qa-ai/scripts/bootstrap-agent-adapters.mjs`
- `.qa-ai/scripts/init.mjs`
- `.qa-ai/scripts/doctor.mjs`
- `.qa-ai/scripts/clean.mjs`
- `.qa-ai/scripts/validate-features.mjs`
- `.qa-ai/scripts/smoke-test.mjs`
- `.qa-ai/scripts/sync-agent-adapters.mjs`

Scripts must be dependency-light and runnable with Node.js 20+.

### Step 3 - Implement `init.mjs`

The script must:

1. Run from the target repository root.
2. Read a preset from `.qa-ai/presets/`.
3. Generate `qa-ai.config.yaml` if it does not exist.
4. Create `qa-ai-output/`.
5. Create `features/` subfolders.
6. Create configured UI test folders when `automation.ui.framework` is not `none` or `undecided`.
7. Create configured API test folders when `automation.api.framework` is not `none` or `undecided`.
8. Generate `AGENTS.md` if it does not exist.
9. Generate `.opencode/` by default and generate other adapters only when requested.
10. Never overwrite existing files unless `--force` is passed.
11. Support agent-first bootstrapping through `/qa-init`, which delegates to this script.
12. Reject configured output paths that are absolute or resolve outside the target repository.
13. Generate starter `qa-ai-output/*.md` artifacts only when `--with-doc-templates` is passed.
14. Generate the configured test management mapping file only when `--with-test-management-mapping` is passed.
15. Accept `--qa-context <path>` for one repo-local QA knowledge folder, validate that it exists as a directory, and record it under `knowledge`.

### Step 4 - Implement agent bootstrap

The script `.qa-ai/scripts/bootstrap-agent-adapters.mjs` must:

1. Run after only `.qa-ai/` has been copied into a target repo.
2. Copy `.qa-ai/adapters/claude/commands/qa-init.md` to `.claude/commands/qa-init.md`.
3. Copy `.qa-ai/adapters/opencode/commands/qa-init.md` to `.opencode/commands/qa-init.md`.
4. Support `--agents`, `--agent`, `--force` and `--help`.
5. Never overwrite existing command files unless `--force` is passed.
6. Record created bootstrap files in the init manifest.

### Step 5 - Implement `doctor.mjs`

The script must:

1. Validate `qa-ai.config.yaml` exists.
2. Validate `.qa-ai/` exists.
3. Validate required templates exist.
4. Validate required agents exist.
5. Validate configured feature and QA output paths exist.
6. Warn if framework config files are missing.
7. Validate configured QA context paths when `knowledge.enabled` is true.
8. Produce clear pass/warn/fail output.

### Step 6 - Implement `clean.mjs`

The script must:

1. Read `.qa-ai/state/init-manifest.json`.
2. Run as dry-run by default.
3. Delete only tracked entries when `--force` is passed.
4. Protect modified tracked files by comparing hashes.
5. Require `--include-modified` before deleting modified tracked files.
6. Remove directories only when they are tracked and empty.
7. Never remove the copied `.qa-ai/` framework folder.
8. Update the manifest after cleanup.

### Step 7 - Implement `validate-features.mjs`

The script must scan `.feature` files and validate:

- One configured scenario keyword per file.
- The configured acceptance criteria label exists: `Acceptance Criteria:` for English or `Criterios de aceptación:` for Spanish.
- Required tags exist: `@priority:`, `@type:`, `@manual:`.
- Required tags include values, for example `@priority:high`.
- Spanish Gherkin files include `# language: es`.
- Feature title contains an RF-like identifier.
- Scenario title contains an RF-like identifier.

### Step 7a - Implement smoke tests

The script `.qa-ai/scripts/smoke-test.mjs` must use native Node.js APIs to verify:

- Init preserves preset paths when framework flags match the preset defaults.
- Init records a valid `--qa-context` folder and rejects unsafe context paths.
- Generated files are not overwritten without `--force`.
- Unsafe configured paths outside the repository are rejected.

### Step 8 - Implement adapter sync

The script must copy adapter templates from `.qa-ai/adapters/` into target repo paths.

Supported adapters:

- `generic`: `AGENTS.md`
- `claude`: `.claude/`
- `codex`: `.codex/`
- `opencode`: `.opencode/`
- `cline`: `.clinerules` and `.cline/`
- `continue`: `.continue/`
- `aider`: `.aider.conf.yml`
- `goose`: `.goose/recipes/qa-flowkit.yaml`
- `gemini`: `GEMINI.md`

Claude and OpenCode adapters must include slash command files for:

- `qa-init`
- `qa-full-flow`
- `qa-doctor`
- `qa-clean`
- `qa-validate-features`

These commands should be guided by default. When no arguments are provided, they must ask for required context before running scripts or modifying files. Direct flags remain supported as advanced mode.

### Step 9 - Keep documentation updated

Whenever code changes, update:

- `README.md`
- `docs/qa-ai/architecture.md`
- `docs/qa-ai/agent-compatibility.md`
- `docs/qa-ai/backlog.md` if scope changes.

## Acceptance criteria

- A user can copy `.qa-ai/` into a new repository.
- A user can run `node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode` and then use `/qa-init` in Claude Code or OpenCode.
- A user can run `node .qa-ai/scripts/init.mjs` for the default setup.
- The target repository receives `qa-ai.config.yaml`, QA output folders, feature folders and requested adapter files.
- A user can run `node .qa-ai/scripts/doctor.mjs` and receive a meaningful report.
- A user can run `node .qa-ai/scripts/clean.mjs` and receive a safe dry-run cleanup plan.
- A user can run `node .qa-ai/scripts/validate-features.mjs` and receive validation results.
- A maintainer can run `node .qa-ai/scripts/smoke-test.mjs` for core regression checks.
- Existing files are not overwritten by default.
- The project is ready to publish publicly on GitHub.

## Done means

The project can be pushed to GitHub as open source and used by another person by following the README.
