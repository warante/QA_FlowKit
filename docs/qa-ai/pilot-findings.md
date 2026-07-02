# Pilot Findings

Notes from the first QA FlowKit target-repository pilot. Written without exposing private repository details; all paths and identifiers are generic.

These notes predate the common [pilot methodology](pilot-methodology.md). Their available evidence is mapped without
invented timing or baseline values in
[`pilot-records/first-pilot-retrospective.json`](pilot-records/first-pilot-retrospective.json).

## Summary

The first pilot ran against a real automation repository using WebdriverIO (UI) and Playwright API. The folder-copy workflow, init scripts, adapters and validators worked correctly end-to-end. The core finding is that the framework delivers value fastest when the agent has clear context about existing tests and the team's QA process.

## What worked well

### Init and configuration

- `node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api` completed in under a minute and produced a correct `qa-ai.config.yaml` with no manual edits needed.
- The `--qa-context` flag let the team point to an existing `qa-knowledge/` folder. The agent read it during `/qa-init` and proposed accurate defaults for tool choices and Gherkin language.
- `doctor.mjs` immediately identified a missing Playwright config file (it had been renamed). This caught a real issue before any workflow ran.

### Gherkin generation

- The requirement intake agent correctly split a multi-acceptance-criteria RF into atomic Gherkin scenarios.
- The traceability matrix was generated with correct RF IDs, feature file paths and test management IDs after a single agent pass.
- `validate-features.mjs` caught two files with missing `@manual:` tags and one with a missing Acceptance Criteria block. All three were fixed in the same agent session.

### Adapters

- The Claude Code adapter (`/qa-init`, `/qa-full-flow`) worked without modification.
- The OpenCode adapter required no changes. Agents using both tools produced consistent output.

## Friction points and solutions

### Friction: RF ID is required before final generation

The validator requires an official RF ID in the filename and Scenario title before a `.feature` file is considered valid (Feature titles may stay clean; use `@rf:` for traceability). During the pilot, early drafts used placeholder IDs (`DRAFT-001`), which caused validator failures.

**Solution already in place:** `validate-features.mjs` accepts `--allow-empty` for in-progress work. The agent should use placeholder IDs and note that the official RF ID must be substituted before the PR.

**Recommended practice:** include a note in the requirement intake output that the official RF ID must come from the issue tracker before Gherkin generation finalizes.

### Friction: Traceability matrix column order

The agent occasionally generated a traceability matrix with columns in a different order than the template. The validator rejected it.

**Solution already in place:** `validate-traceability.mjs` checks for required columns by name, not position. If you encounter this, ensure the template columns are present; order does not matter.

**Recommended practice:** copy the column headers directly from `.qa-ai/templates/traceability-matrix.template.md` to prevent mismatches.

### Friction: Adapters overwriting existing files on `init`

If `.claude/commands/qa-init.md` already existed from a previous manual copy, `init --adapters claude` would refuse to overwrite it.

**Solution already in place:** pass `--force` to `sync-adapters` or `update` to refresh adapter files. `update` preserves `.qa-ai/state/` and `.qa-ai/config-profiles/` during the framework upgrade.

### Friction: `validate-sync-plan.mjs` rejects "done" status without approval language

The sync plan validator requires proposal-first language and rejects rows that claim an external write already happened (`Created in TestRail`, `Updated`). During the pilot, the agent wrote a retrospective sync plan after a manual TestRail sync and the validator rejected it.

**Solution:** the sync plan artifact is for **proposals**, not retrospective logs. Retrospective records belong in `test-management-mapping.json` under the corresponding TC key.

## Migration notes for the next adopter

### Step-by-step

1. Run `npx qa-flowkit` (or `node .qa-ai/scripts/init.mjs --preset manual-only` for manual-only teams after copying).
2. Run `npx qa-flowkit doctor` and fix any `[FAIL]` items before proceeding.
3. Create a `qa-ai-knowledge/` folder with your team's QA process notes and re-run `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge`.
4. Open Claude Code or OpenCode and run `/qa-init`. The agent reads context and proposes workflow defaults.
5. Work through phases in order: `intake` → `test-design` → `gherkin` → `traceability`.
6. Run `npx qa-flowkit validate-features` and `npx qa-flowkit validate-traceability` before each PR.
7. Run `npx qa-flowkit validate-target` for a full pre-PR check once the repository is initialized.

### Common validator flags

| Flag                 | When to use                                     |
| -------------------- | ----------------------------------------------- |
| `--allow-empty`      | Feature or traceability files not yet generated |
| `--allow-missing`    | Optional artifact files not yet created         |
| `--no-strict-doctor` | Repository is partially initialized             |

### Config overrides

Use `npx qa-flowkit config --export .qa-ai/config-profiles/team.yaml` to save the team config and `config --import` to apply it in a fresh clone or second repository.

## Links

- [Getting Started](getting-started.md) — step-by-step flows by user type.
- [Troubleshooting](troubleshooting.md) — common error messages and fixes.
- [Architecture](architecture.md) — framework structure and design decisions.
