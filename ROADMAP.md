# Roadmap

## Current status - Early Product

QA FlowKit has moved beyond the folder-copy MVP. The portable `.qa-ai/` framework, init/bootstrap scripts, adapters, validation workflow, CI, GitHub repository hardening and public releases are in place.

The current product phase is **Early Product**: usable by public adopters, still improving through pilots, stronger validations, examples and packaging.

## Completed - Portable folder MVP

Goal: create a folder that can be copied into any QA/automation repository.

Delivered:

- `.qa-ai/` portable framework structure.
- `qa-ai.config.yaml` generation.
- Agent adapter generation for Claude Code, OpenCode, Codex, Cline, Continue, Aider, Goose and Gemini CLI.
- Agent-first bootstrap through `/qa-init` for Claude Code and OpenCode.
- Documentation, rules, templates and validation scripts.
- Manifest-based cleanup with dry-run default.
- CI workflow running doctor, validators and smoke tests.
- GitHub repository hardening with branch rules, CodeQL, Dependabot and secret scanning.

## Phase 1 - Pilot repositories

Goal: validate that the workflow works across different QA and automation setups.

Deliverables:

- Pilot with WebdriverIO + Playwright API.
- Pilot with Selenium + Jest + BrowserStack or a manual-only project.
- Feedback from generated Gherkin, traceability and automation planning.
- Documented friction points and migration notes from real target repositories.

## Phase 2 - Stronger validators

Goal: make the framework reliable without trusting prompts only.

Delivered:

- Parsed Gherkin structure validation for feature files.
- Duplicate explicit test case ID validation.
- Traceability matrix coverage validation.
- Proposal-first test-management sync plan validation.
- Active specialist index validation against `qa-ai.config.yaml`.

Next:

- Replace lightweight parsing with a full Gherkin parser when the project accepts dependencies or ships an npm CLI.
- Validate traceability matrix row shape and duplicate matrix entries.
- Validate dry-run TestRail/Zephyr/Xray plans against richer mapping schemas.
- Add `doctor --strict` for fully initialized target repositories.

## Phase 3 - Guided examples and public docs

Goal: make adoption obvious for first-time users.

Deliverables:

- Example manual-only repository.
- Example WebdriverIO + Playwright API repository.
- Getting-started flows by user type: manual QA, automation QA, maintainers and agent-first users.
- Troubleshooting guide for init, adapters, feature validation and CI failures.
- Screenshots or short terminal transcripts for common workflows.

## Phase 4 - npm CLI

Goal: replace manual copy with `npx qa-flowkit init` or an equivalent package workflow.

Deliverables:

- Node package.
- Interactive prompts.
- Presets.
- Update/migration command.
- Non-interactive CI-friendly install.

## Phase 5 - MCP and integrations

Goal: add controlled integrations with Jira, Confluence, TestRail and GitHub.

Deliverables:

- MCP configuration templates.
- Read-only requirement intake tools.
- Proposal-first write tools.
- Audit logs.
- Approval gates.

## Phase 6 - Productization

Goal: turn the starter into a stable open-source framework.

Deliverables:

- Public documentation site.
- Example repositories.
- Adapter registry.
- Stable config contract.
- Release automation.
- Compatibility and migration policy.
