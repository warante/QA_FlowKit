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
- [Commands](#commands)
- [Presets](#presets)
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
| Scripts | `bootstrap-agent-adapters`, `init`, `doctor`, `clean`, `validate-features`, `smoke-test`, `sync-agent-adapters` |
| Rules | Approval, Gherkin, test management, automation, UI automation and API testing |
| Agents | Phase agents plus active specialists from `.qa-ai/agents/specialists/active.md` |
| Templates | Requirement analysis, test design, traceability, automation planning and PR summary |
| Adapters | AGENTS.md, Claude Code, Codex, OpenCode, Cline, Continue, Aider and Goose |

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
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --interface-language en --gherkin-language en
node .qa-ai/scripts/doctor.mjs
```

Then open the repository with your AI coding tool and start with:

```text
Read AGENTS.md, qa-ai.config.yaml and .qa-ai/workflows/full-flow.md. Follow .qa-ai/rules/ before making changes.
```

Framework and path flags are advanced overrides. When a preset already defines the frameworks you want, omit those flags so the preset paths are preserved.

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

Use `/qa-init` rather than `/init`; both Claude Code and OpenCode have their own built-in `/init` commands. The guided command asks for language, preset, adapters, optional framework overrides and overwrite behavior.

Advanced direct form:

```text
/qa-init --preset webdriverio-playwright-api --interface-language es --gherkin-language en --adapters claude,opencode
```

## Commands

| Command | Purpose |
|---|---|
| `node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode` | Copy minimal root slash commands for agent-first setup |
| `node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --interface-language en --gherkin-language en` | Generate config, folders, docs and adapters |
| `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all` | Sync selected adapter templates |
| `node .qa-ai/scripts/doctor.mjs` | Check setup health |
| `node .qa-ai/scripts/validate-features.mjs` | Validate generated `.feature` files |
| `node .qa-ai/scripts/smoke-test.mjs` | Run maintainer smoke checks |
| `node .qa-ai/scripts/clean.mjs` | Preview cleanup of generated artifacts |

`init.mjs` never overwrites existing files unless `--force` is passed. `validate-features.mjs` fails when no `.feature` files are found; use `--allow-empty` only for source-repo smoke checks or other cases where an empty feature folder is expected.

## Presets

| Preset | Best For | Default Automation |
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

## Generated Structure

```text
qa-ai.config.yaml
AGENTS.md
.claude/
.codex/
.opencode/
.cline/
.clinerules
.continue/
.aider.conf.yml
.aider/
.goose/
docs/qa/
features/
tests/
```

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
