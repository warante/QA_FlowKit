# Roadmap

## Current status

QA FlowKit is in **Release Candidate**. The portable framework, npm CLI, deterministic validators, repository-native harness,
release automation and first real target-repository pilot are complete.

The remaining path to `1.0.0` is product stabilization, not broad feature expansion. Stable `1.0.0` requires:

- coherent product and security documentation;
- a concise first-use experience and reproducible public demonstration;
- evidence from multiple target repositories and QA team profiles;
- stable CLI, config, workflow, state and validator contracts;
- explicit security and agent-compatibility claims backed by tests;
- release-candidate soak time and a rehearsed stable release.

The executable implementation plan, owners, dependencies and acceptance criteria live in
[`tasks/`](tasks/README.md).

## Delivered foundation

- Portable `.qa-ai/` framework and `qa-ai.config.yaml` generation.
- npm CLI with `init`, `update`, `doctor`, validators, guided help and resumable `run` commands.
- Agent adapters for Claude Code, OpenCode, Codex, Cline, Continue, Aider, Goose and Gemini CLI.
- Quick, standard and enterprise workflow tracks.
- Gherkin, traceability, test-design, sync-plan, Karate, Maestro and release-gate validators.
- Persistent local run state, approval gates, bounded validation retries and repository path isolation.
- Linux and Windows CI on Node.js 20 and 22.
- Golden manual target and Karate target fixtures.
- Manual, Playwright UI+API, Karate and Maestro+Karate public references in validation for the 1.0 adoption gate.
- npm package verification, release-please, CodeQL, Dependabot and secret scanning.
- First real pilot using WebdriverIO and Playwright API.

## Path to 1.0

| Milestone                | Scope                                                               | Exit gate                                                                                      |
| ------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| M1 - Product baseline    | Epic 13: documentation, version and security consistency            | No contradictory version, maturity, audit or support claims; automated consistency checks pass |
| M2 - Adoption path       | Epics 14-15: concise README, demo and public reference repositories | A new evaluator can understand and run a complete example without maintainer assistance        |
| M3 - External validation | Epic 16: three representative pilots and before/after metrics       | Pilot evidence covers quick, standard and enterprise usage with published anonymized findings  |
| M4 - Contract freeze     | Epic 17: CLI/config/workflow/state stability and migration coverage | Public contracts are versioned, compatibility-tested and frozen for the release candidate      |
| M5 - Trust baseline      | Epic 18: threat model, agent compatibility and E2E/CI hardening     | Security boundaries and compatibility claims are explicit and verified at their stated level   |
| M6 - Release candidate   | Epic 19: `1.0.0-rc` validation and soak                             | RC passes the full support matrix with no unresolved P0/P1 defects                             |
| M7 - Stable release      | Epic 20: stable release and post-release verification               | `1.0.0` is published through release-please on `latest` and install/update smoke tests pass    |

## Product expansion

| Epic    | Scope                                      | Exit gate                                                                                                                                                                                                                        |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EPIC-P0 | Hardening and first-use experience         | A new user can run `npx qa-flowkit init` and reach a valid, schema-checked, placeholder-free configuration with synced adapters and pre-created feature folders in one command; roadmap, intake security and self-quality align. |
| EPIC-P1 | Host-native enforcement and CI integration | Claude Code hooks provide immediate validation feedback and stop-gate protection; any repository can add the QA FlowKit gate to a PR in five lines of workflow YAML; shipped skills follow current Agent Skills conventions.     |
| EPIC-P2 | Governed external writes                   | A connected test-management MCP can apply exactly an approved sync batch and verify the remote state against the approved plan, with rollback planning and run-event audit evidence.                                             |
| EPIC-P3 | Semantic quality and execution evidence    | Release gates can require linked passing execution results and a versioned Gherkin quality report, with traceability and results exported to Cucumber JSON and Allure.                                                           |
| EPIC-P4 | AI-system testing                          | AI-marked requirements require AI-specific design techniques, statistical Gherkin validates, and enterprise gates can require linked eval-report evidence.                                                                       |
| EPIC-P5 | Distribution and ecosystem                 | Claude Code plugin installation, custom validators, local metrics and parser upgrades are available while the npm CLI remains the multi-agent source of truth.                                                                   |

## Scope guardrails

The following are **not required for 1.0.0**:

- model hosting or model selection;
- a hosted QA FlowKit backend;
- full tool-level enforcement against an agent with unrestricted shell access;
- interactive CLI prompts.

Governed external writes are in scope for future product expansion. Proposal-first remains the default; direct writes
always require recorded approval.

## Release gates

`1.0.0` may proceed only when all of the following are true:

- Epics 13 through 19 are complete and their evidence is linked from [`tasks/README.md`](tasks/README.md).
- CI and CodeQL are green on `main`.
- Clean install, update, harness recovery and npm-pack E2E scenarios pass on the supported OS/Node matrix.
- No unresolved P0 or P1 defects remain; accepted P2 risks are documented with owners.
- The beta-to-1.0 migration guide has been tested from the oldest supported beta fixture.
- Public docs describe capabilities and limitations accurately.
- A human maintainer has confirmed npm Trusted Publishing and the release-please stable configuration.

## After 1.0

Post-1.0 candidates are prioritized through the product expansion section in this roadmap.
