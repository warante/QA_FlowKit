# QA FlowKit

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933.svg)](package.json)
[![Status: RC](https://img.shields.io/badge/status-RC-yellow.svg)](docs/qa-ai/stability-policy.md)
[![CI](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml/badge.svg)](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/qa-flowkit.svg)](https://www.npmjs.com/package/qa-flowkit)

Turn AI-assisted QA work into a repeatable, reviewable repository workflow.

Language: **English** | [Español](README.es.md)

QA FlowKit coordinates an AI coding agent while deterministic scripts enforce the workflow:

```text
requirement -> test design -> Gherkin -> traceability -> automation plan -> release gate
```

It is for QA and automation teams that want AI-generated artifacts without relying only on prompt discipline.
QA FlowKit is currently in **Release Candidate**; see the [stability policy](docs/qa-ai/stability-policy.md).

## The Problem It Solves

AI agents can generate tests quickly, but teams still need consistent structure, traceability, approval points and
reliable validation. QA FlowKit installs those controls inside the target repository:

- phase-specific agent instructions and reusable specialists (including on-demand strategy specialists — see [specialist routing](docs/qa-ai/specialist-routing-matrix.md); standard presets ship with `testDesign.strategyRouting.mode: advisory` to recommend specialists from requirement signals without blocking validators; `manual-only` keeps routing off);
- quick, standard and enterprise workflow tracks;
- persistent, resumable run state and an append-only event log;
- validation for Gherkin, traceability, test design, sync plans and release gates;
- configurable cross-feature coverage checks and traceable test-design techniques;
- source non-functional requirement (NFR) coverage validation against `normalized-requirements.md`, proposal tables and traceability;
- opt-in AI-system testing support with AI-component tags, technique coverage and eval evidence checks;
- functional security review and mixed-source requirement intake;
- overwrite, path traversal, deletion and secret-handling safeguards;
- proposal-first planning for Jira, TestRail, Zephyr, Xray and similar tools.

The AI reasons and edits files. QA FlowKit controls phase order, required outputs, approvals and pass/fail checks.

## Five-Minute Start

From the repository where you want QA FlowKit:

```bash
npx qa-flowkit init
# choose your AI coding CLI adapter in the setup menu
npx qa-flowkit doctor # optional
```

Open the repository in your AI coding CLI. Use the generated QA command surface:

```text
/qa-help
/qa-add-tests
/qa-full-flow
```

`/qa-help` shows the available framework commands and recommends the next QA step. Claude Code and OpenCode expose
project slash commands through generated adapters; agents without slash-command support use generated adapter
instructions (`AGENTS.md`, `GEMINI.md`, `.codex/README.md`, etc.).

During the RC line, pin reproducible setup or CI to `npx qa-flowkit@rc ...` when you need the `rc` channel explicitly.
After the agent creates or updates QA artifacts, run `npx qa-flowkit validate-target` as the repository quality gate.

## Demo

| Format                                                   | Description                                                |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| [Static walkthrough](docs/qa-ai/demo.md)                 | RF-101 story, fixtures and expected E2E output             |
| [Recording script](docs/qa-ai/demo-script.md)            | Two-minute terminal demo script for maintainers            |
| [Transcript and captions](docs/qa-ai/demo-transcript.md) | Alt text, captions and static fallback                     |
| `npm run test:e2e-quick`                                 | One-command automated replay from a clean temporary target |

A recorded capture can be published from the script when ready; the static path is the supported fallback today.

The deterministic RF-101 demo, including an intentional validator failure and correction, is also documented in
[Getting Started](docs/qa-ai/getting-started.md#reproduce-the-verified-path). From this source repository you can
replay it:

```bash
npm run test:e2e-quick
```

For a complete reviewed target that installs and validates from the packed CLI, use the
[manual-only public example](examples/manual-only/README.md):

```bash
npm run test:e2e-manual-example
```

## What Gets Installed

```text
.qa-ai/               framework, rules, agents, workflows and validators
qa-ai.config.yaml      target-repository configuration
qa-ai-output/          generated analysis, plans and traceability
features/              manual and automated QA design in Gherkin
AGENTS.md              generic agent instructions when no host-specific override is selected
```

Automation folders are generated only when the selected preset requires them. In an interactive terminal, `init`
shows an AI CLI adapter selector; in non-interactive environments it detects existing agent host folders and syncs
matching adapters plus `generic`. When no host folder exists, it generates only `generic`. Existing files are skipped
unless the user explicitly passes `--force`.

## Choose a Track

| Track        | Use it for                                       | Main output                                                                    |
| ------------ | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `quick`      | Small changes and manual QA                      | Requirements, Gherkin, traceability and PR summary                             |
| `standard`   | Most QA automation repositories                  | Full test design, test-management planning, feasibility and implementation     |
| `enterprise` | Formal governance, audit or release requirements | Standard workflow plus strict target validation and a release quality decision |

The track controls workflow depth; presets configure frameworks and tools.

## Presets

| Preset                       | Typical track | Automation                  |
| ---------------------------- | ------------- | --------------------------- |
| `manual-only`                | `quick`       | None                        |
| `playwright-full`            | `standard`    | Playwright UI + API         |
| `maestro-karate-mobile`      | `standard`    | Maestro mobile + Karate API |
| `karate-full`                | `standard`    | Karate API + UI             |
| `webdriverio-playwright-api` | `standard`    | Legacy compatibility preset |
| `selenium-jest-browserstack` | `standard`    | Selenium/Jest               |

Example:

```bash
npx qa-flowkit@rc init --preset karate-full --adapters generic,claude
```

See the [configuration schema](docs/qa-ai/config-schema.md) for all generated keys.

## Core Commands

| Command                                               | Purpose                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `qa-flowkit init`                                     | Install and configure the framework                          |
| `qa-flowkit update`                                   | Upgrade `.qa-ai/` while preserving run state                 |
| `qa-flowkit doctor`                                   | Diagnose installation and configuration                      |
| `qa-flowkit help`                                     | Recommend the next QA workflow step                          |
| `qa-flowkit run start\|next\|check`                   | Execute a resumable controlled workflow                      |
| `qa-flowkit metrics`                                  | Report local workflow KPIs from run event logs               |
| `qa-flowkit validate-target`                          | Run the target-repository quality gate                       |
| `qa-flowkit validate-untrusted-content`               | Scan requirements/context for prompt-injection-like content  |
| `qa-flowkit validate-features`                        | Validate QA design Gherkin                                   |
| `qa-flowkit validate-test-coverage`                   | Validate configured coverage obligations and source NFR rows |
| `qa-flowkit validate-traceability`                    | Validate RF-to-test and NFR traceability                     |
| `qa-flowkit validate-release-gate`                    | Validate the enterprise release decision                     |
| [`qa-flowkit export-report`](docs/qa-ai/reporting.md) | Export Gherkin-aligned test cases and execution results      |

The complete command and option reference is in [CLI Reference](docs/qa-ai/cli-reference.md).
`qa-flowkit metrics` reads only local run state under `.qa-ai/state/runs/`; it never reads artifact contents or sends
telemetry.

## Deterministic Rules

QA FlowKit validates, among other things:

- configured English or Spanish Gherkin;
- one `.feature` file per test case;
- manual tests represented as `.feature` files;
- acceptance-criteria blocks;
- required `@priority:`, `@type:` and `@manual:` tags;
- prompt-injection-like instructions in requirement and QA context sources;
- official RF traceability and duplicate test IDs;
- proposal-first test-management sync language;
- required enterprise release-gate evidence and test execution results.

See [Gherkin rules](.qa-ai/rules/gherkin.rules.md) and the
[framework rules index](.qa-ai/rules/README.md).

## Agents and Adapters

The generic `AGENTS.md` contract works with any repository-aware coding agent. Templates are also available for:

- Claude Code;
- Codex Desktop;
- OpenCode;
- Cline;
- Continue;
- Aider;
- Goose;
- Gemini CLI.

Adapters use native structured questions when the host exposes them and numbered options otherwise. Interface
language comes from `project.interfaceLanguage`; `gherkin.language` controls only `.feature` content.

Adapter generation is tested automatically. Real-host verification levels are documented separately and should not
be confused with tool-level sandbox enforcement. See [Agent Compatibility](docs/qa-ai/agent-compatibility.md).

## Safety and Limits

QA FlowKit:

- keeps workflow state and outputs inside the repository;
- rejects configured paths that escape the repository;
- requires scoped approval before modifying pre-existing phase outputs;
- denies external writes and deletes in the current workflow contract;
- treats requirement files, QA context folders and imported external content as untrusted data;
- scans those untrusted sources for prompt-injection-like instructions, with `--strict` available when teams want a
  blocking gate;
- scans generated QA artifacts for secret-like content during strict validation;
- supports native settings-level enforcement hooks on Claude Code to prevent turn completion with validation failures or missing checks.

It does **not** host or invoke an AI model. An agent with unrestricted shell access can operate outside the harness;
see the [agent harness](docs/qa-ai/agent-harness.md) for the exact boundary.

## Updating

```bash
npx qa-flowkit@rc update
npx qa-flowkit doctor --strict
npx qa-flowkit validate-target
```

`update` replaces the framework folder while preserving `.qa-ai/state/`, config profiles and user-owned artifacts
outside `.qa-ai/`. Review the [beta-to-1.0 migration guide](docs/qa-ai/beta-to-1.0-migration.md).

## Documentation

| Topic                        | Document                                                                    |
| ---------------------------- | --------------------------------------------------------------------------- |
| First workflow               | [Getting Started](docs/qa-ai/getting-started.md)                            |
| CLI commands and options     | [CLI Reference](docs/qa-ai/cli-reference.md)                                |
| CI/CD pipeline integration   | [CI Integration](docs/qa-ai/ci-integration.md)                              |
| Claude Code plugin           | [Claude Code Plugin](docs/qa-ai/claude-plugin.md)                           |
| Architecture                 | [Architecture](docs/qa-ai/architecture.md)                                  |
| Workflow                     | [Full Workflow](docs/qa-ai/workflow.md)                                     |
| Advanced test design         | [Coverage, techniques and mixed inputs](docs/qa-ai/advanced-test-design.md) |
| Gherkin quality rubric       | [Quality Rubric](docs/qa-ai/quality-rubric.md)                              |
| Resumable harness            | [Agent Harness](docs/qa-ai/agent-harness.md)                                |
| Troubleshooting              | [Troubleshooting](docs/qa-ai/troubleshooting.md)                            |
| Product stability            | [Stability Policy](docs/qa-ai/stability-policy.md)                          |
| Public contracts             | [Contract Inventory](docs/qa-ai/public-contracts.md)                        |
| Threat model                 | [Threat Model](docs/qa-ai/threat-model.md)                                  |
| Pilot measurement            | [Pilot Methodology](docs/qa-ai/pilot-methodology.md)                        |
| External requirements intake | [External Intake](docs/qa-ai/external-intake.md)                            |
| Governed test sync           | [Governed Sync](docs/qa-ai/governed-sync.md)                                |
| Automation bridge / healing  | [Automation Bridge](docs/qa-ai/automation-bridge.md)                        |
| Roadmap and implementation   | [Roadmap](ROADMAP.md) and [implementation tasks](tasks/README.md)           |
| Security                     | [Security Policy](SECURITY.md)                                              |
| Contributing                 | [Contributing Guide](CONTRIBUTING.md)                                       |

## Source Repository

This repository maintains the framework, CLI, CI and npm package. A target QA repository receives `.qa-ai/`,
configuration and generated QA artifacts through `npx qa-flowkit init`.

Before proposing a source-repository PR:

```bash
npm ci
npm run lint
npm run format:check
npm run docs:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

Releases use release-please. Do not manually bump versions, publish locally or create release tags. See the
[release checklist](docs/qa-ai/release-checklist.md).

## License

[MIT](LICENSE)
