# Roadmap

## Phase 0 - Portable folder MVP

Goal: create a folder that can be copied into any QA/automation repository.

Deliverables:

- `.qa-ai/` structure.
- `qa-ai.config.yaml` generation.
- `AGENTS.md` generation.
- `.claude/`, `.opencode/`, `.codex/`, `.clinerules`, `.continue/`, `.aider.conf.yml` and Goose recipe generation where applicable.
- Documentation, rules, templates and validation scripts.

## Phase 1 - Pilot in two repositories

Goal: validate that the workflow works across different automation setups.

Deliverables:

- Pilot with WebdriverIO + Playwright API.
- Pilot with Selenium + Jest + BrowserStack or manual-only project.
- Feedback from generated Gherkin, traceability and automation planning.

## Phase 2 - Stronger validators

Goal: make the repo pack reliable without trusting prompts only.

Deliverables:

- Gherkin parser-based validation.
- Traceability matrix validation.
- Duplicate RF/test ID validation.
- Dry-run TestRail sync plan validation.
- CI examples.

## Phase 3 - npm CLI

Goal: replace manual copy with `npx qa-ai-workflow init`.

Deliverables:

- Node package.
- Interactive prompts.
- Presets.
- Update/migration command.
- Non-interactive CI-friendly install.

## Phase 4 - MCP and integrations

Goal: add controlled integrations with Jira, Confluence, TestRail and GitHub.

Deliverables:

- MCP configuration templates.
- Read-only requirement intake tools.
- Proposal-first write tools.
- Audit logs.
- Approval gates.

## Phase 5 - Productization

Goal: turn the starter into a reusable open-source framework.

Deliverables:

- Public documentation site.
- Example repositories.
- Adapter registry.
- Contribution guidelines.
- Release automation.
