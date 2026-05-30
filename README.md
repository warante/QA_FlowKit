# QA FlowKit

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933.svg)](package.json)
[![Status: Beta](https://img.shields.io/badge/status-Beta-orange.svg)](docs/qa-ai/stability-policy.md)
[![Workflow: QA AI](https://img.shields.io/badge/workflow-QA%20AI-6f42c1.svg)](docs/qa-ai/workflow.md)
[![CI](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml/badge.svg)](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/qa-flowkit.svg)](https://www.npmjs.com/package/qa-flowkit)

Portable open-source framework and npm CLI for adding an AI-assisted QA workflow to an existing QA or automation repository.

Language: **English** | [Español](README.es.md)

## Table of Contents

- [Two repositories](#two-repositories)
- [What It Does](#what-it-does)
- [Quick Start](#quick-start)
- [npm package](#npm-package)
- [Upgrading the framework](#upgrading-the-framework)
- [Guided Usage Paths](#guided-usage-paths)
- [Agent-First Bootstrap](#agent-first-bootstrap)
- [QA Context Folder](#qa-context-folder)
- [QA Workflow Tracks and Guided Help](#qa-workflow-tracks-and-guided-help)
- [Commands](#commands)
- [Validation](#validation)
- [Init Options](#init-options)
- [Base Templates](#base-templates)
- [Adapters](#adapters)
- [Generated Structure](#generated-structure)
- [Gherkin Rules](#gherkin-rules)
- [Cleanup](#cleanup)
- [Documentation](#documentation)
- [License](#license)

## Two repositories

|            | QA FlowKit **source** (this repo) | **Your** QA/automation repo                                         |
| ---------- | --------------------------------- | ------------------------------------------------------------------- |
| Role       | Framework, CLI, CI, npm package   | Requirements, tests, `qa-ai-output/`                                |
| Install    | Clone or contribute here          | `npx qa-flowkit@beta init`                                          |
| Agent file | Root [AGENTS.md](AGENTS.md)       | Generated [AGENTS.md](.qa-ai/adapters/generic/AGENTS.md) after init |

## What It Does

QA FlowKit is in **Beta** (`0.5.0-beta.x`): the portable folder workflow is implemented, validated in CI (including an in-repo golden target fixture), and ships an npm CLI ([`qa-flowkit` on npm](https://www.npmjs.com/package/qa-flowkit)). Run `npx qa-flowkit init` in a target repository, and the repo receives configuration, agent instructions, workflow docs, validation scripts, templates and adapters for common coding-agent tools.

The starter does **not** perform external writes to configured tools. It creates proposal-first artifacts and local repo files only.

| Area         | Included                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Portable `.qa-ai/` folder                                                                                                                                                        |
| Scripts      | `bootstrap-agent-adapters`, `init`, `config`, `doctor`, `clean`, `qa-help`, stronger validators, `validate-target`, `validate-release-gate`, `smoke-test`, `sync-agent-adapters` |
| Rules        | Approval, Gherkin, test management, automation, UI automation and API testing                                                                                                    |
| Agents       | Phase agents plus active specialists from `.qa-ai/agents/specialists/active.md`                                                                                                  |
| Templates    | Requirement analysis, system/RF test design, traceability, automation planning, release gate and PR summary                                                                      |
| Guided help  | `qa-help` and `/qa-help` recommend the next workflow phase from artifacts and `project.qaTrack`                                                                                  |
| Release gate | Enterprise `release-gate.yaml` with `PASS` / `CONCERNS` / `FAIL` / `WAIVED` decisions                                                                                            |
| QA context   | Optional repo-local folder with team QA practices for agent-assisted init defaults                                                                                               |
| Adapters     | AGENTS.md, Claude Code, Codex, OpenCode, Cline, Continue, Aider, Goose and Gemini CLI                                                                                            |

```text
Requirements
  -> requirement intake
  -> official RF + acceptance criteria validation
  -> system test design (standard / enterprise)
  -> per-RF test design proposal
  -> Gherkin feature files
  -> test management coverage analysis
  -> test management sync plan
  -> traceability matrix
  -> automation feasibility
  -> configured-framework implementation plan
  -> PR-ready summary
```

## Quick Start

**5-minute path:** [getting-started.md](docs/qa-ai/getting-started.md#5-minute-quick-path) — `init` → `help` → one RF → validate.

Run this from the target repository where you want to install QA FlowKit (Node.js 20+):

```bash
npx qa-flowkit@beta init
```

Legacy alpha pin:

```bash
npx qa-flowkit@alpha init
```

### Presets

| Preset                         | `init` flag                                     | Typical `qaTrack` | Automation                                |
| ------------------------------ | ----------------------------------------------- | ----------------- | ----------------------------------------- |
| Manual-only                    | `--preset manual-only`                          | `quick`           | None                                      |
| WebdriverIO + Playwright API   | `--preset webdriverio-playwright-api` (default) | `standard`        | UI + API                                  |
| Selenium + Jest + BrowserStack | `--preset selenium-jest-browserstack`           | `standard`        | Alternate stack                           |
| Karate full (API + UI)         | `--preset karate-full`                          | `standard`        | Karate DSL under `tests/karate/features/` |

See [config-schema.md](docs/qa-ai/config-schema.md).

Then open the repository with your AI coding tool and start with:

```text
Read AGENTS.md, qa-ai.config.yaml, .qa-ai/rules/README.md and .qa-ai/workflows/full-flow.md. Follow all `.qa-ai/rules/*.rules.md` files before making changes.
```

When unsure what to run next:

```bash
npx qa-flowkit help
```

Or use `/qa-help` in Claude Code or OpenCode after syncing adapters.

By default, init uses the `webdriverio-playwright-api` base template with English interface, English Gherkin and the OpenCode adapter only. It creates the minimum usable structure first; starter QA documents and extra adapters are opt-in.

Folder-copy alternative (source checkout, air-gapped environments, or contributors working from this repo):

```bash
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

## npm package

| Item            | Detail                                                                  |
| --------------- | ----------------------------------------------------------------------- |
| Package         | [`qa-flowkit`](https://www.npmjs.com/package/qa-flowkit)                |
| Current version | `0.5.0-beta.0` (beta channel)                                           |
| CLI binary      | `qa-flowkit` (`init`, `update`, `doctor`, `validate-target`, `help`, …) |
| Requirements    | Node.js 20+                                                             |

**Target repository (recommended):**

```bash
npx qa-flowkit init
npx qa-flowkit update
npx qa-flowkit doctor
```

**Pin beta during Beta:**

```bash
npx qa-flowkit@beta init
npx qa-flowkit@beta update
```

**Publishing a new release (maintainers):**

1. Merge PRs to `main` with [Conventional Commits](https://www.conventionalcommits.org/) in PR titles (`feat:`, `fix:`, …).
2. Review and merge the **Release PR** opened by [release-please](.github/workflows/release-please.yml) (bumps `package.json` and [CHANGELOG](CHANGELOG.md)).
3. Merging creates a GitHub Release + tag and publishes to npm with provenance. Prereleases use the matching dist-tag (`alpha`, `beta`, …); stable semver publishes as `latest`.
4. Prefer [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) on workflow `release-please.yml`; until configured, use the `NPM_TOKEN` repository secret. Emergency: **Actions → Publish npm (manual fallback)**.

See [release checklist](docs/qa-ai/release-checklist.md). Republishing an existing version fails by design.

## Upgrading the framework

If you already copied an older `.qa-ai/` folder into your repository, refresh the **portable framework** with the npm CLI or from a newer [QA FlowKit](https://github.com/warante/QA_FlowKit) release. Your workflow artifacts (`qa-ai.config.yaml`, `qa-ai-output/`, `features/`, `tests/`, custom `AGENTS.md` edits) live **outside** `.qa-ai/` and are not removed when you replace that folder.

### Before you start

1. Commit or back up the repository (especially `qa-ai.config.yaml` and `qa-ai-output/`).
2. Note which adapters you use (Claude Code, OpenCode, Codex, etc.).
3. Skim the release notes or [CHANGELOG](CHANGELOG.md) for new config keys (for example `project.qaTrack`, `testDesign.*`, `release.gatePath`).

### Recommended upgrade steps

**1. Preferred: update through npm**:

```bash
npx qa-flowkit update
```

This replaces only `.qa-ai/`, preserves `.qa-ai/state/` and `.qa-ai/config-profiles/`, refreshes active specialists, syncs existing adapters without overwriting them, and runs `doctor`.

**Manual fallback: replace the `.qa-ai/` folder** with the version from the latest QA FlowKit checkout or release tag:

```bash
# Unix / macOS (from your target repository root)
rm -rf .qa-ai
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
```

```powershell
# Windows PowerShell (from your target repository root)
Remove-Item -Recurse -Force .\.qa-ai
Copy-Item -Recurse -LiteralPath C:\path\to\QA_FlowKit\.qa-ai -Destination .\.qa-ai
```

**2. Refresh agent slash commands and adapter files** (safe to overwrite adapter templates; does not touch `qa-ai.config.yaml`):

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters claude,opencode --force
```

Add every adapter you use (`generic`, `codex`, `cline`, `continue`, `aider`, `goose`, `gemini`) or pass `--adapters all`.

**3. Re-run init without overwriting your config** (creates missing folders, refreshes `.qa-ai/agents/specialists/active.md`; skips existing `qa-ai.config.yaml` unless you pass `--force`):

```bash
node .qa-ai/scripts/init.mjs --no-adapters
```

**4. Merge new settings into `qa-ai.config.yaml` manually** by comparing your file with the matching preset under `.qa-ai/presets/`. Do **not** run `init.mjs --force` unless you intend to replace the whole config. Typical additions in recent versions:

| Key                       | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `project.qaTrack`         | Workflow depth: `quick`, `standard`, `enterprise` |
| `testDesign.systemPath`   | System-level test design document                 |
| `testDesign.proposalPath` | Per-RF test design proposal                       |
| `release.gatePath`        | Enterprise release gate YAML                      |

To export your current config before editing:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/backup-before-upgrade.yaml
```

**5. Add missing starter documents** (optional; only creates files that do not exist yet):

```bash
node .qa-ai/scripts/init.mjs --with-doc-templates --no-adapters
```

Use `--force` only if you explicitly want to reset generated templates under `qa-ai-output/`.

**6. Verify the upgrade:**

```bash
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/qa-help.mjs
npm run qa:validate-target -- --allow-empty --allow-missing --no-strict-doctor
```

Adjust flags when your repository already has real `.feature` files and workflow artifacts.

### What init does and does not overwrite

| Path                                  | Default on re-init        | With `--force`                                |
| ------------------------------------- | ------------------------- | --------------------------------------------- |
| `.qa-ai/`                             | Replace manually (step 1) | Same                                          |
| `qa-ai.config.yaml`                   | Skipped if present        | Overwritten from preset                       |
| `qa-ai-output/*.md` (templates)       | Skipped if present        | Overwritten when using `--with-doc-templates` |
| `.claude/`, `.opencode/`, etc.        | Skipped                   | Overwritten via `sync-agent-adapters --force` |
| `.qa-ai/agents/specialists/active.md` | Always regenerated        | Always regenerated                            |
| `features/`, `tests/`                 | Never touched by init     | Never touched                                 |

### Minimal agent-first upgrade

If you only use `/qa-init` in Claude Code or OpenCode:

```bash
rm -rf .qa-ai
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode --force
node .qa-ai/scripts/doctor.mjs
```

Then merge any new keys into `qa-ai.config.yaml` and run `/qa-help` to see the updated workflow phases.

## Guided Usage Paths

### Try QA FlowKit in a new repository

Use the default setup when you want the quickest path to a working QA AI workflow:

```bash
npx qa-flowkit init
```

### Manual QA only

Use this when you want requirements-to-Gherkin and traceability without automation folders:

```bash
npx qa-flowkit init --preset manual-only --interface-language en --gherkin-language en
```

### Automation repository

Use the default template for WebdriverIO UI/E2E plus Playwright API planning:

```bash
npx qa-flowkit init --preset webdriverio-playwright-api
npx qa-flowkit validate-features --allow-empty
```

### Agent-first setup

Use this when Claude Code or OpenCode should guide initialization through `/qa-init`:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

Then open the agent and run:

```text
/qa-init
```

## Agent-First Bootstrap

Use this flow when Claude Code or OpenCode should initialize the repo through `/qa-init`.

| Platform   | Command                                                                              |
| ---------- | ------------------------------------------------------------------------------------ |
| Unix/macOS | `cp -R /path/to/qa-flowkit/.qa-ai .qa-ai`                                            |
| PowerShell | `Copy-Item -Recurse -LiteralPath C:\path\to\qa-flowkit\.qa-ai -Destination .\.qa-ai` |

Then run:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

Open Claude Code or OpenCode in the target repository and run:

```text
/qa-init
```

Use `/qa-init` rather than `/init`; both Claude Code and OpenCode have their own built-in `/init` commands. The guided command asks for language, base template, adapters, optional framework overrides and overwrite behavior.

Advanced direct form:

```text
/qa-init --preset webdriverio-playwright-api --interface-language es --gherkin-language en --adapters claude,opencode
```

## QA Context Folder

For a more tailored setup, add a repository-local folder that documents how QA works for your team, then start init through an agent:

```text
/qa-init --qa-context qa-ai-knowledge
```

The agent reads `.qa-ai/workflows/context-intake.md`, summarizes the QA context, proposes default init flags, asks for approval, and then runs `init.mjs` with `--qa-context <path>`. The Node script records the approved folder in `qa-ai.config.yaml`; it does not interpret the documents itself.

When enabled, future QA workflows should read the configured knowledge artifacts before planning:

```text
qa-ai-output/qa-knowledge-summary.md
qa-ai-output/qa-init-decisions.md
```

## QA Workflow Tracks and Guided Help

QA FlowKit adapts workflow depth using `project.qaTrack` in `qa-ai.config.yaml` (inspired by BMAD Method tracks and TEA gate decisions).

### Workflow tracks

| Track        | Default preset                   | Active phases (summary)                                                                             | Best for                                             |
| ------------ | -------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `quick`      | `manual-only`                    | Intake, normalization, Gherkin, traceability, PR                                                    | Manual QA, narrow scope, fast Gherkin + traceability |
| `standard`   | `webdriverio-playwright-api`     | Full workflow including test-management planning, feasibility and automation phases when configured | Most automation repositories                         |
| `enterprise` | set with `--qa-track enterprise` | Same as `standard`, plus **release gate** and stricter `validate-target`                            | Compliance, audit trails, formal go/no-go            |

Set the track at init:

```bash
node .qa-ai/scripts/init.mjs --preset manual-only --qa-track quick
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --qa-track standard
node .qa-ai/scripts/init.mjs --qa-track enterprise --with-doc-templates
```

| Track        | Skipped by default                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `quick`      | Test-management coverage/sync, automation feasibility, UI/API implementation, issue task drafts, system test design, release gate |
| `standard`   | Release gate; phases skipped when tools/frameworks are `none` (see orchestrator)                                                  |
| `enterprise` | None beyond config-based skips; requires `release-gate.yaml` before calling the workflow complete                                 |

Details: [QA help and tracks](docs/qa-ai/qa-help.md).

### Guided next steps (`qa-help`)

`qa-help` inspects `qa-ai.config.yaml`, `qa-ai-output/`, `features/` and `.qa-ai/state/` to list completed, pending and skipped phases, then prints prioritized recommendations (`required`, `recommended`, `optional`).

```bash
npm run qa:help
node .qa-ai/scripts/qa-help.mjs
node .qa-ai/scripts/qa-help.mjs --json
```

After each `/qa-full-flow` step or agent phase, run `/qa-help` again. `/qa-status` includes `qa-help` output for the suggested next command.

### Release gate (enterprise)

After the PR summary, record a formal decision in `qa-ai-output/release-gate.yaml`:

| Decision   | Meaning                                                      |
| ---------- | ------------------------------------------------------------ |
| `PASS`     | Ready to release                                             |
| `CONCERNS` | Release with documented follow-ups                           |
| `FAIL`     | Blocking gaps remain                                         |
| `WAIVED`   | Exception accepted (requires `approver` and `waived_reason`) |

```bash
node .qa-ai/scripts/validate-release-gate.mjs
npm run qa:validate-release-gate
```

`/qa-gate` guides the agent through the gate workflow. `validate-target.mjs` runs the release gate validator automatically when `project.qaTrack` is `enterprise`.

Details: [Release gate](docs/qa-ai/release-gate.md).

### Test design dual-mode (standard / enterprise)

Before per-RF Gherkin files, produce:

1. `qa-ai-output/test-design-system.md` — architecture alignment, risks and cross-RF strategy.
2. `qa-ai-output/test-design-proposal.md` — cases for the active RF/epic (approval before `.feature` files).

The `quick` track skips the system phase and may combine proposal + features in one Gherkin pass.

Details: [Test design dual-mode](docs/qa-ai/test-design-dual-mode.md).

## Commands

| Command                                                                           | Purpose                                                                            |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npx qa-flowkit init`                                                             | Install `.qa-ai/`, generate config, folders and the default OpenCode adapter       |
| `npx qa-flowkit update`                                                           | Refresh `.qa-ai/` from the npm package while preserving target artifacts           |
| `npx qa-flowkit doctor`                                                           | Check setup health through the npm CLI                                             |
| `npx qa-flowkit validate-target --allow-empty --allow-missing --no-strict-doctor` | Run target validation through the npm CLI                                          |
| `node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode`       | Copy minimal root slash commands for agent-first setup                             |
| `node .qa-ai/scripts/init.mjs`                                                    | Generate the minimum config, folders and OpenCode adapter                          |
| `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge`                       | Record a QA context folder for agent-assisted defaults                             |
| `node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml`        | Export the current config as a reusable profile                                    |
| `node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml`        | Import a reusable config profile                                                   |
| `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all`                      | Sync selected adapter templates                                                    |
| `node .qa-ai/scripts/doctor.mjs`                                                  | Check setup health                                                                 |
| `node .qa-ai/scripts/doctor.mjs --strict`                                         | Fail CI-style checks for initialized target repositories                           |
| `node .qa-ai/scripts/validate-features.mjs`                                       | Validate generated `.feature` files                                                |
| `node .qa-ai/scripts/validate-traceability.mjs`                                   | Validate traceability matrix coverage for feature IDs                              |
| `node .qa-ai/scripts/validate-sync-plan.mjs`                                      | Validate proposal-first test-management sync plans                                 |
| `node .qa-ai/scripts/validate-active-specialists.mjs`                             | Validate active specialist list against config                                     |
| `node .qa-ai/scripts/validate-target.mjs`                                         | Run strict target-repository validation after real QA artifacts exist              |
| `node .qa-ai/scripts/qa-help.mjs`                                                 | Recommend the next QA phase from artifacts and `project.qaTrack`                   |
| `node .qa-ai/scripts/validate-release-gate.mjs`                                   | Validate enterprise release gate YAML                                              |
| `npm run qa:help`                                                                 | Same as `qa-help.mjs`                                                              |
| `npm run qa:validate-release-gate`                                                | Same as `validate-release-gate.mjs`                                                |
| `node .qa-ai/scripts/validate-test-design.mjs`                                    | Validate system and per-RF test design markdown structure                          |
| `npm run qa:validate-test-design`                                                 | Same as `validate-test-design.mjs`                                                 |
| `node .qa-ai/scripts/test-validators.mjs`                                         | Run native Node unit tests for shared validator helpers                            |
| `node .qa-ai/scripts/smoke-test.mjs`                                              | Run maintainer smoke checks                                                        |
| `node .qa-ai/scripts/smoke-npm-pack.mjs`                                          | Run npm pack/install smoke checks                                                  |
| `npm run validate:oss-extraction`                                                 | Run doctor, stronger validators, validator unit tests and smoke tests (same as CI) |
| `node .qa-ai/scripts/clean.mjs`                                                   | Preview cleanup of generated artifacts                                             |

Claude Code and OpenCode adapters also provide guided slash commands:

| Slash Command           | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `/qa-init`              | Guided initialization                                                             |
| `/qa-config`            | Import or export reusable QA AI config profiles                                   |
| `/qa-full-flow`         | End-to-end requirements-to-PR QA flow                                             |
| `/qa-add-tests`         | Add tests for a new RF without disturbing existing tests                          |
| `/qa-update-tests`      | Review existing tests after RF changes and apply approved updates                 |
| `/qa-automation-plan`   | Classify existing `.feature` files and plan automation                            |
| `/qa-coverage`          | Analyze functional coverage across RFs, manual tests and automated tests          |
| `/qa-help`              | Context-aware guidance for the next QA workflow step                              |
| `/qa-status`            | Summarize config, artifacts, feature health and recommended next steps            |
| `/qa-gate`              | Record enterprise release gate decision (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) |
| `/qa-doctor`            | Setup health checks                                                               |
| `/qa-clean`             | Manifest-based cleanup preview/execution                                          |
| `/qa-validate-features` | Gherkin convention validation                                                     |

`init.mjs` and `config.mjs --import` never overwrite existing files unless `--force` is passed. `validate-features.mjs` fails when no `.feature` files are found; use `--allow-empty` only for source-repo smoke checks or other cases where an empty feature folder is expected.

## Validation

QA FlowKit now uses stronger local validators without external dependencies:

| Validator                         | Checks                                                                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doctor.mjs`                      | Framework assets, required scripts, rules, templates, agents, presets, adapters and configured paths; `--strict` promotes target-repository workflow artifacts and configured framework files from warnings to failures |
| `validate-features.mjs`           | Parsed Gherkin structure, language directive, one Feature, one Scenario, acceptance criteria, required tags, RF IDs and duplicate explicit test IDs                                                                     |
| `validate-traceability.mjs`       | Feature RF/test identifiers are represented in the configured traceability matrix, with Markdown table shape and duplicate case/file checks                                                                             |
| `validate-sync-plan.mjs`          | Test-management sync plans stay proposal-first, mention approval, cover feature identifiers and pass Markdown table, duplicate ID and mapping-file checks                                                               |
| `validate-active-specialists.mjs` | `.qa-ai/agents/specialists/active.md` matches `qa-ai.config.yaml` and referenced specialist files exist                                                                                                                 |
| `validate-release-gate.mjs`       | Enterprise release gate YAML shape, decision rules and evidence paths                                                                                                                                                   |
| `validate-test-design.mjs`        | System and per-RF test design markdown section structure                                                                                                                                                                |
| `smoke-test.mjs`                  | Copy-folder install, config import/export, adapters, no-overwrite behavior, unsafe path rejection and validator behavior                                                                                                |

For source-repo CI, use:

```bash
npm run validate:oss-extraction
```

For a configured target repository with real `.feature` files and workflow artifacts, run the validators without `--allow-empty` / `--allow-missing` once the corresponding files should exist.

Use strict doctor mode in target repository CI after initialization and at least one real QA flow has generated the configured workflow artifacts:

```bash
node .qa-ai/scripts/validate-target.mjs
```

For incomplete target repositories, use `node .qa-ai/scripts/validate-target.mjs --allow-empty --allow-missing --no-strict-doctor`.

### Test-management mapping

When `--with-test-management-mapping` is passed, init creates the configured mapping file as an empty JSON object (`{}`) so new repositories do not start with fake external IDs.

Use [.qa-ai/templates/test-management-mapping.template.json](.qa-ai/templates/test-management-mapping.template.json) as the documented reference. Mapping keys must be RF/test IDs such as `RF-101` or `TC-001`, or `.feature` paths. Values must be objects with supported fields only: `externalId`, `section`, `suite`, `status`, `lastReviewedAt`, and `notes`. Do not store secrets, tokens or credentials in mapping files.

To reuse the same setup across repositories with the same structure, export a profile from the configured repository and import it in the next one:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml
node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml
```

Importing a profile writes `qa-ai.config.yaml`, creates the configured folders and refreshes `.qa-ai/agents/specialists/active.md`. Use `--no-structure` when you only want to copy the YAML.

## Init Options

`init.mjs` works with no flags. Use flags only when the default base template or language choices are not what you want.

| Option                           | Values                                                                                           | Default                      | Purpose                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------- |
| `--preset <name>`                | `webdriverio-playwright-api`, `selenium-jest-browserstack`, `manual-only`                        | `webdriverio-playwright-api` | Selects the base template used to generate `qa-ai.config.yaml`       |
| `--interface-language <lang>`    | `en`, `es`                                                                                       | `en`                         | Language for generated QA artifact headings and guided workflow text |
| `--gherkin-language <lang>`      | `en`, `es`                                                                                       | `en`                         | Language for generated `.feature` files                              |
| `--requirements-source <name>`   | `markdown`, `jira`, `confluence`, `pasted-text`, custom value                                    | Base template value          | Sets the primary requirement source                                  |
| `--test-management-tool <name>`  | `none`, `testrail`, `zephyr`, `xray`, custom value                                               | Base template value          | Sets the configured test management tool                             |
| `--issue-tracker <name>`         | `none`, `jira`, `github`, custom value                                                           | Base template value          | Sets the configured issue tracker                                    |
| `--qa-context <path>`            | repo-local folder                                                                                | off                          | Enables QA knowledge context for agent-assisted init                 |
| `--qa-track <name>`              | `quick`, `standard`, `enterprise`                                                                | From preset                  | Controls workflow depth and `qa-help` phase list                     |
| `--adapters <list>`              | `all`, `generic`, `codex`, `claude`, `opencode`, `cline`, `continue`, `aider`, `goose`, `gemini` | `opencode`                   | Selects generated agent adapters                                     |
| `--no-adapters`                  | flag                                                                                             | off                          | Skips adapter generation                                             |
| `--with-doc-templates`           | flag                                                                                             | off                          | Generates starter Markdown artifacts under `qa-ai-output/`           |
| `--with-test-management-mapping` | flag                                                                                             | off                          | Creates the configured test management mapping file                  |
| `--force`                        | flag                                                                                             | off                          | Allows overwriting generated files                                   |

Advanced framework and path overrides:

| Option                          | Example Values                                                             | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `--ui-framework <name>`         | `none`, `undecided`, `webdriverio`, `playwright`, `cypress`, `selenium`    | Overrides the UI/E2E framework from the base template          |
| `--api-framework <name>`        | `none`, `undecided`, `playwright-api`, `postman`, `rest-assured`, `karate` | Overrides the API/integration framework from the base template |
| `--ui-specs-path <path>`        | `tests/wdio/specs`                                                         | Overrides the UI specs path                                    |
| `--ui-page-objects-path <path>` | `tests/wdio/pageobjects`                                                   | Overrides the UI page objects path                             |
| `--api-specs-path <path>`       | `tests/api/specs`                                                          | Overrides the API specs path                                   |
| `--specialist-mode <mode>`      | `auto`, `off`, `required`                                                  | Controls specialist activation                                 |
| `--set <key=value>`             | `automation.ui.framework=cypress`                                          | Sets a scalar config value directly                            |

Examples:

```bash
# Default setup
node .qa-ai/scripts/init.mjs

# Spanish interface and Spanish Gherkin, no automation folders
node .qa-ai/scripts/init.mjs --preset manual-only --interface-language es --gherkin-language es

# Generate only generic and Codex adapters
node .qa-ai/scripts/init.mjs --adapters generic,codex

# Generate starter QA artifact templates too
node .qa-ai/scripts/init.mjs --with-doc-templates

# Record a QA context folder after the agent has reviewed it
node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge

# Generate every supported adapter
node .qa-ai/scripts/init.mjs --adapters all
```

Framework and path flags are advanced overrides. When a base template already defines the frameworks you want, omit those flags so the template paths are preserved.

## Base Templates

The `--preset` flag name is kept for CLI compatibility, but conceptually these are base templates: they provide a complete starting config that your flags can override.

| Base Template (`--preset`)   | Best For                             | Default Automation                    |
| ---------------------------- | ------------------------------------ | ------------------------------------- |
| `webdriverio-playwright-api` | QA + automation repositories         | WebdriverIO UI/E2E and Playwright API |
| `selenium-jest-browserstack` | Selenium-style UI automation         | Selenium/Jest/BrowserStack folders    |
| `manual-only`                | QA design without automation folders | None                                  |

## Adapters

| Adapter     | Generated Path               | Notes                                 |
| ----------- | ---------------------------- | ------------------------------------- |
| Generic     | `AGENTS.md`                  | Cross-agent behavior and safety rules |
| Claude Code | `.claude/`                   | Slash commands including `/qa-init`   |
| Codex       | `.codex/`                    | Codex onboarding prompts              |
| OpenCode    | `.opencode/`                 | Slash commands including `/qa-init`   |
| Cline       | `.clinerules`, `.cline/`     | Cline behavior and docs               |
| Continue    | `.continue/`                 | Review/check guidance                 |
| Aider       | `.aider.conf.yml`, `.aider/` | Read list and command notes           |
| Goose       | `.goose/`                    | Workflow recipe                       |
| Gemini CLI  | `GEMINI.md`                  | Gemini CLI project context            |

## Generated Structure

```text
qa-ai.config.yaml
.opencode/
qa-ai-output/
qa-ai-output/qa-knowledge-summary.md       # Optional, written by agent-assisted QA context intake
qa-ai-output/qa-init-decisions.md          # Optional, written by agent-assisted QA context intake
features/
tests/

# Optional, only when requested through --adapters
AGENTS.md
.claude/
.codex/
.cline/
.clinerules
.continue/
.aider.conf.yml
.aider/
.goose/
GEMINI.md
```

Default init creates only the minimum useful files and folders. It does not create starter `qa-ai-output/*.md` artifacts unless `--with-doc-templates` is passed, and it generates only the OpenCode adapter unless `--adapters` requests more.

The exact `tests/` subfolders are config-aware. Init creates configured UI/API paths when frameworks are set, and skips automation folders when frameworks are `none` or `undecided`.

When `project.interfaceLanguage` is `es`, init localizes the generated QA Markdown artifact headings. Gherkin language remains controlled separately by `gherkin.language`.

## Gherkin Rules

| Rule                | Requirement                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| Language            | English (`en`) or Spanish (`es`) from `qa-ai.config.yaml`                    |
| Spanish directive   | Spanish `.feature` files must include `# language: es`                       |
| File model          | One `.feature` file per test case                                            |
| Scenario model      | One configured scenario keyword per file                                     |
| Acceptance criteria | `Acceptance Criteria:` for English or `Criterios de aceptación:` for Spanish |
| Required tags       | `@priority:<value>`, `@type:<value>`, `@manual:<value>`                      |
| Scope               | Manual tests have `.feature` files; unit tests are out of scope              |

## Cleanup

`init.mjs` and `sync-agent-adapters.mjs` maintain a manifest at:

```text
.qa-ai/state/init-manifest.json
```

Cleanup is a dry-run by default:

```bash
node .qa-ai/scripts/clean.mjs
```

To execute cleanup, pass `--force` plus the scope you want:

```bash
node .qa-ai/scripts/clean.mjs --generated --force
node .qa-ai/scripts/clean.mjs --adapters --empty-dirs --force
node .qa-ai/scripts/clean.mjs --all --force
```

Safety rules:

- Files are deleted only when they are tracked in the manifest.
- Files changed since init are skipped by default.
- `--include-modified` is required to delete modified tracked files.
- Directories are removed only when tracked and empty.
- The copied `.qa-ai/` framework folder is not removed by clean.

## Documentation

| Document                                                     | Purpose                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [Getting started](docs/qa-ai/getting-started.md)             | Step-by-step setup flows by user type                                   |
| [Pilot findings](docs/qa-ai/pilot-findings.md)               | First pilot notes, friction points and migration guidance               |
| [Example repositories](docs/qa-ai/example-repos.md)          | In-repo golden target fixture and CI template                           |
| [Config schema](docs/qa-ai/config-schema.md)                 | `qa-ai.config.yaml` keys from presets                                   |
| [Extensibility](docs/qa-ai/extensibility.md)                 | Add specialists, rules, validators, adapters                            |
| [Stability policy](docs/qa-ai/stability-policy.md)           | Beta contract and migration from alpha                                  |
| [QA help and tracks](docs/qa-ai/qa-help.md)                  | Context-aware next steps, workflow tracks and phase skips               |
| [Release gate](docs/qa-ai/release-gate.md)                   | Enterprise go/no-go decisions (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) |
| [Test design dual-mode](docs/qa-ai/test-design-dual-mode.md) | System-level and per-RF test design artifacts (BMAD TEA-inspired)       |
| [Terminal transcripts](docs/qa-ai/terminal-transcripts.md)   | Real command output for common workflows                                |
| [Troubleshooting](docs/qa-ai/troubleshooting.md)             | Common failures and resolutions                                         |
| [Release checklist](docs/qa-ai/release-checklist.md)         | Step-by-step checklist for publishing a new version to npm              |
| [Architecture](docs/qa-ai/architecture.md)                   | Framework structure and safety model                                    |
| [Workflow](docs/qa-ai/workflow.md)                           | End-to-end QA flow                                                      |
| [Agent compatibility](docs/qa-ai/agent-compatibility.md)     | Adapter behavior and command discovery                                  |
| [Customizing agents](docs/qa-ai/customizing-agents.md)       | How to adapt agents, specialists and adapters safely                    |
| [Cleanup](docs/qa-ai/cleanup.md)                             | Manifest-based cleanup details                                          |
| [npm CLI migration](docs/qa-ai/npm-migration-plan.md)        | npm install, update contract and release workflow                       |
| [Roadmap](ROADMAP.md)                                        | Product direction                                                       |
| [Contributing](CONTRIBUTING.md)                              | Contribution guidelines                                                 |
| [Security](SECURITY.md)                                      | Vulnerability and secret-handling policy                                |

## License

MIT. See [LICENSE](LICENSE).
