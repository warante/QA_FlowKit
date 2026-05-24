# QA AI Starter

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933.svg)](package.json)
[![Status: MVP](https://img.shields.io/badge/status-MVP-blue.svg)](ROADMAP.md)
[![Workflow: QA AI](https://img.shields.io/badge/workflow-QA%20AI-6f42c1.svg)](docs/qa-ai/workflow.md)

Portable open-source starter kit for adding an AI-assisted QA workflow to an existing QA or automation repository.

Language: **English** | [Español](README.es.md)

## Table of Contents

- [What It Does](#what-it-does)
- [Quick Start](#quick-start)
- [Agent-First Bootstrap](#agent-first-bootstrap)
- [QA Context Folder](#qa-context-folder)
- [Commands](#commands)
- [Init Options](#init-options)
- [Base Templates](#base-templates)
- [Adapters](#adapters)
- [Generated Structure](#generated-structure)
- [Gherkin Rules](#gherkin-rules)
- [Cleanup](#cleanup)
- [Documentation](#documentation)
- [License](#license)

## What It Does

The MVP is intentionally copy-folder based: copy `.qa-ai/` into a target repository, run the local Node.js scripts, and the target repo receives configuration, agent instructions, workflow docs, validation scripts, templates and adapters for common coding-agent tools.

The starter does **not** perform external writes to configured tools in the MVP. It creates proposal-first artifacts and local repo files only.

| Area | Included |
|---|---|
| Framework | Portable `.qa-ai/` folder |
| Scripts | `bootstrap-agent-adapters`, `init`, `config`, `doctor`, `clean`, `validate-features`, `smoke-test`, `sync-agent-adapters` |
| Rules | Approval, Gherkin, test management, automation, UI automation and API testing |
| Agents | Phase agents plus active specialists from `.qa-ai/agents/specialists/active.md` |
| Templates | Requirement analysis, test design, traceability, automation planning and PR summary |
| QA context | Optional repo-local folder with team QA practices for agent-assisted init defaults |
| Adapters | AGENTS.md, Claude Code, Codex, OpenCode, Cline, Continue, Aider, Goose and Gemini CLI |

```text
Requirements
  -> requirement intake
  -> official RF + acceptance criteria validation
  -> test management coverage analysis
  -> Gherkin test design
  -> test management sync plan
  -> traceability matrix
  -> automation feasibility
  -> configured-framework implementation plan
  -> PR-ready summary
```

## Quick Start

Run this from the target repository where you want to install the starter:

```bash
cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

Then open the repository with your AI coding tool and start with:

```text
Read AGENTS.md, qa-ai.config.yaml and .qa-ai/workflows/full-flow.md. Follow .qa-ai/rules/ before making changes.
```

By default, init uses the `webdriverio-playwright-api` base template with English interface, English Gherkin and the OpenCode adapter only. It creates the minimum usable structure first; starter QA documents and extra adapters are opt-in.

## Agent-First Bootstrap

Use this flow when Claude Code or OpenCode should initialize the repo through `/qa-init`.

| Platform | Command |
|---|---|
| Unix/macOS | `cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai` |
| PowerShell | `Copy-Item -Recurse -LiteralPath C:\path\to\qa-ai-starter\.qa-ai -Destination .\.qa-ai` |

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

## Commands

| Command | Purpose |
|---|---|
| `node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode` | Copy minimal root slash commands for agent-first setup |
| `node .qa-ai/scripts/init.mjs` | Generate the minimum config, folders and OpenCode adapter |
| `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge` | Record a QA context folder for agent-assisted defaults |
| `node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml` | Export the current config as a reusable profile |
| `node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml` | Import a reusable config profile |
| `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all` | Sync selected adapter templates |
| `node .qa-ai/scripts/doctor.mjs` | Check setup health |
| `node .qa-ai/scripts/validate-features.mjs` | Validate generated `.feature` files |
| `node .qa-ai/scripts/smoke-test.mjs` | Run maintainer smoke checks |
| `node .qa-ai/scripts/clean.mjs` | Preview cleanup of generated artifacts |

Claude Code and OpenCode adapters also provide guided slash commands:

| Slash Command | Purpose |
|---|---|
| `/qa-init` | Guided initialization |
| `/qa-config` | Import or export reusable QA AI config profiles |
| `/qa-full-flow` | End-to-end requirements-to-PR QA flow |
| `/qa-add-tests` | Add tests for a new RF without disturbing existing tests |
| `/qa-update-tests` | Review existing tests after RF changes and apply approved updates |
| `/qa-automation-plan` | Classify existing `.feature` files and plan automation |
| `/qa-coverage` | Analyze functional coverage across RFs, manual tests and automated tests |
| `/qa-status` | Summarize config, artifacts, feature health and recommended next steps |
| `/qa-doctor` | Setup health checks |
| `/qa-clean` | Manifest-based cleanup preview/execution |
| `/qa-validate-features` | Gherkin convention validation |

`init.mjs` and `config.mjs --import` never overwrite existing files unless `--force` is passed. `validate-features.mjs` fails when no `.feature` files are found; use `--allow-empty` only for source-repo smoke checks or other cases where an empty feature folder is expected.

To reuse the same setup across repositories with the same structure, export a profile from the configured repository and import it in the next one:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml
node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml
```

Importing a profile writes `qa-ai.config.yaml`, creates the configured folders and refreshes `.qa-ai/agents/specialists/active.md`. Use `--no-structure` when you only want to copy the YAML.

## Init Options

`init.mjs` works with no flags. Use flags only when the default base template or language choices are not what you want.

| Option | Values | Default | Purpose |
|---|---|---|---|
| `--preset <name>` | `webdriverio-playwright-api`, `selenium-jest-browserstack`, `manual-only` | `webdriverio-playwright-api` | Selects the base template used to generate `qa-ai.config.yaml` |
| `--interface-language <lang>` | `en`, `es` | `en` | Language for generated QA artifact headings and guided workflow text |
| `--gherkin-language <lang>` | `en`, `es` | `en` | Language for generated `.feature` files |
| `--requirements-source <name>` | `markdown`, `jira`, `confluence`, `pasted-text`, custom value | Base template value | Sets the primary requirement source |
| `--test-management-tool <name>` | `none`, `testrail`, `zephyr`, `xray`, custom value | Base template value | Sets the configured test management tool |
| `--issue-tracker <name>` | `none`, `jira`, `github`, custom value | Base template value | Sets the configured issue tracker |
| `--qa-context <path>` | repo-local folder | off | Enables QA knowledge context for agent-assisted init |
| `--adapters <list>` | `all`, `generic`, `codex`, `claude`, `opencode`, `cline`, `continue`, `aider`, `goose`, `gemini` | `opencode` | Selects generated agent adapters |
| `--no-adapters` | flag | off | Skips adapter generation |
| `--with-doc-templates` | flag | off | Generates starter Markdown artifacts under `qa-ai-output/` |
| `--with-test-management-mapping` | flag | off | Creates the configured test management mapping file |
| `--force` | flag | off | Allows overwriting generated files |

Advanced framework and path overrides:

| Option | Example Values | Purpose |
|---|---|---|
| `--ui-framework <name>` | `none`, `undecided`, `webdriverio`, `playwright`, `cypress`, `selenium` | Overrides the UI/E2E framework from the base template |
| `--api-framework <name>` | `none`, `undecided`, `playwright-api`, `postman`, `rest-assured`, `karate` | Overrides the API/integration framework from the base template |
| `--ui-specs-path <path>` | `tests/wdio/specs` | Overrides the UI specs path |
| `--ui-page-objects-path <path>` | `tests/wdio/pageobjects` | Overrides the UI page objects path |
| `--api-specs-path <path>` | `tests/api/specs` | Overrides the API specs path |
| `--specialist-mode <mode>` | `auto`, `off`, `required` | Controls specialist activation |
| `--set <key=value>` | `automation.ui.framework=cypress` | Sets a scalar config value directly |

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

| Base Template (`--preset`) | Best For | Default Automation |
|---|---|---|
| `webdriverio-playwright-api` | QA + automation repositories | WebdriverIO UI/E2E and Playwright API |
| `selenium-jest-browserstack` | Selenium-style UI automation | Selenium/Jest/BrowserStack folders |
| `manual-only` | QA design without automation folders | None |

## Adapters

| Adapter | Generated Path | Notes |
|---|---|---|
| Generic | `AGENTS.md` | Cross-agent behavior and safety rules |
| Claude Code | `.claude/` | Slash commands including `/qa-init` |
| Codex | `.codex/` | Codex onboarding prompts |
| OpenCode | `.opencode/` | Slash commands including `/qa-init` |
| Cline | `.clinerules`, `.cline/` | Cline behavior and docs |
| Continue | `.continue/` | Review/check guidance |
| Aider | `.aider.conf.yml`, `.aider/` | Read list and command notes |
| Goose | `.goose/` | Workflow recipe |
| Gemini CLI | `GEMINI.md` | Gemini CLI project context |

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

| Rule | Requirement |
|---|---|
| Language | English (`en`) or Spanish (`es`) from `qa-ai.config.yaml` |
| Spanish directive | Spanish `.feature` files must include `# language: es` |
| File model | One `.feature` file per test case |
| Scenario model | One configured scenario keyword per file |
| Acceptance criteria | `Acceptance Criteria:` for English or `Criterios de aceptación:` for Spanish |
| Required tags | `@priority:<value>`, `@type:<value>`, `@manual:<value>` |
| Scope | Manual tests have `.feature` files; unit tests are out of scope |

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

| Document | Purpose |
|---|---|
| [Architecture](docs/qa-ai/architecture.md) | Framework structure and safety model |
| [Workflow](docs/qa-ai/workflow.md) | End-to-end QA flow |
| [Agent compatibility](docs/qa-ai/agent-compatibility.md) | Adapter behavior and command discovery |
| [Cleanup](docs/qa-ai/cleanup.md) | Manifest-based cleanup details |
| [Roadmap](ROADMAP.md) | Product direction |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |
| [Security](SECURITY.md) | Vulnerability and secret-handling policy |

## License

MIT. See [LICENSE](LICENSE).
