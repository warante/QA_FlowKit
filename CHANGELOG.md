# Changelog

## Unreleased

### Added

- release-please automation (`.release-please-config.json`, `.release-please-manifest.json`, `.github/workflows/release-please.yml`) for version bumps, changelog, GitHub Release and npm publish from Conventional Commits.
- `.github/scripts/verify-npm-pack.mjs` and CI `npm-pack` job for early tarball allowlist validation.
- npm Trusted Publishing support (OIDC) with `NPM_TOKEN` fallback; post-publish verification in release workflow.
- ESLint (flat config) + Prettier + `.editorconfig` for consistent code style across all 25 `.mjs` scripts.
- `lint`, `lint:fix`, `format`, `format:check` npm scripts.
- `package-lock.json` committed for reproducible CI installs and `npm audit`.
- `.github/scripts/check-syntax.mjs` — portable Node script that replaces the `find | xargs node --check` bash step.

### Changed

- `publish-npm.yml` is manual fallback only (no tag trigger); primary publish path is release-please.
- CI matrix now covers `ubuntu-latest` and `windows-latest` × Node 20 and 22 (was ubuntu-only, Node 20).
- CI lint step runs when `package-lock.json` is present.
- `bin/qa-flowkit.mjs` CLI command surface expanded: `config`, `bootstrap`, `validate-traceability`, `validate-sync-plan`, `validate-active-specialists`, `validate-release-gate`, `validate-test-design` now available via `npx qa-flowkit`.
- `printHelp` lists all available commands with descriptions.
- `parseSimpleYaml` now strips inline YAML comments (` # ...`) from unquoted scalar values.
- `test-validators.mjs` migrated from manual `main()` to `node:test` runner (31 named test cases).
- Removed unused `path` import from `validate-active-specialists.mjs` and `validate-release-gate.mjs`.
- Smoke test now verifies `version`, `help --json`, unknown-command failure and `validate-active-specialists` via the installed CLI.

### Changed (agent audit)

- Removed RF-ID requirement in Gherkin `Feature:` titles from `validate-features.mjs`; traceability via `@rf:`, Scenario title and filename.
- Renumbered phase references in seven phase agents to match the 14-phase orchestrator.
- Aligned `jira-task-agent` primary output with `qa-ai-output/jira-automation-task.md`.
- Updated `gherkin-test-design-agent` examples, config keys, tag tiers and file naming (`RF-TC-desc`).
- Aligned UI/API implementation agents with `project-config.mjs` paths; orchestrator minimum artifacts by track.
- Added `defect-report-agent`, `accessibility` and `performance` specialists; Appium auto-activation via `automation.mobile.framework`.

### Added

- Expanded `.qa-ai/rules/`: `README.md` index, `requirements`, `workflow`, `test-design`, `test-management`, `issue-tracker`, `defect`, `release-gate`, `cleanup`, `ui-automation`; legacy stubs `testrail` / `webdriverio` point to new files.
- Strengthened `approval`, `gherkin`, `automation` and `api-testing` rules for MVP boundaries, traceability and specialists.

### Documentation

- `AGENTS.md` expanded: npm releases, validation/CI, documentation map, updated Gherkin and project structure for agents.
- `adapters/generic/AGENTS.md`, Aider, Cline, Gemini, agent-compatibility and customizing-agents updated for rules index and load order.
- `docs/qa-ai/release-checklist.md` — **For AI agents** protocol section; cross-link to `AGENTS.md`.
- `docs/qa-ai/getting-started.md` — maintainer flow updated (`npm ci`, lint, pack verify, release pointer).
- `docs/qa-ai/pilot-findings.md` — first pilot findings and migration notes (TASK-015).
- `docs/qa-ai/example-repos.md` — guide and checklist for creating example repositories (TASK-027 foundation).

## 0.4.0-alpha.0 - npm CLI

### Added

- npm CLI package identity `qa-flowkit@0.4.0-alpha.0` with `npx qa-flowkit init`.
- `bin/qa-flowkit.mjs` with `init`, `update`, `doctor`, `validate-target`, `validate-features`, `sync-adapters`, `help` and `clean`.
- npm pack/install smoke coverage for CLI install, safe init refusal, update preservation and package file allowlist.
- Explicit npm package `files` allowlist to avoid publishing root adapters, GitHub metadata, caches or target-repository artifacts.
- `qa-help.mjs` and `qa-next-steps.mjs` for context-aware next-step guidance (BMAD-inspired).
- `project.qaTrack` (`quick`, `standard`, `enterprise`) in presets and `init.mjs --qa-track`.
- `/qa-help` slash commands for Claude Code and OpenCode adapters.
- Release quality gate (`release-gate.yaml`, `validate-release-gate.mjs`, `/qa-gate`) with PASS/CONCERNS/FAIL/WAIVED decisions for enterprise track.
- Dual-mode test design: system-level `test-design-system.md`, per-RF proposal, `validate-test-design.mjs` and `testDesign.*` config paths.
- `doctor.mjs --strict` for initialized target repositories and CI hardening.
- `validate-target.mjs` aggregated target-repository validation command.
- Shared Markdown table parsing utilities for stronger validators.
- Native Node unit tests for shared validator helpers.
- Documented test-management mapping template.
- Stronger traceability matrix validation for Markdown table shape, duplicate test case identifiers and duplicate feature file rows.
- Stronger test-management sync plan validation for Markdown table shape, proposal-first rows, approval status and duplicate identifiers.
- Stronger test-management mapping validation for entry shape, duplicate external IDs and secret-like values.
- Smoke coverage for strict doctor success and failure paths.

### Documentation

- Added `docs/qa-ai/qa-help.md`, `release-gate.md` and `test-design-dual-mode.md`.
- Framework upgrade guide in `README.md` and `README.es.md`.
- Documented target-repository hardening status and strict doctor usage in README, roadmap, architecture and backlog.
- Aligned Claude, OpenCode, Codex and generic adapter validation guidance with the hardened validator pipeline.

## 0.3.0 - Context intake y agentes ampliados

Release tras el merge de [#2](https://github.com/warante/QA_FlowKit/pull/2). Enfoque: carpeta de contexto QA del equipo, init/config refactorizados, agentes más accionables y más comandos `/qa-*` en adaptadores agent-first.

### Added

- Agente `qa-context-intake-agent` y workflow `context-intake.md` para prácticas QA locales en una carpeta del repo.
- Scripts `config.mjs` y `lib/project-config.mjs`; comando npm `qa:config`.
- Adaptador **Gemini CLI** (`GEMINI.md` en plantillas).
- Comandos `/qa-*` ampliados en plantillas y salidas **Claude Code** y **OpenCode** (`qa-config`, `qa-status`, `qa-coverage`, `qa-add-tests`, `qa-update-tests`, `qa-automation-plan`, `qa-full-flow`, etc.).
- Documentación de carpeta de contexto QA en README (EN/ES).

### Changed

- `init.mjs` simplificado y alineado con presets y lectura de contexto del proyecto.
- Agentes de fase y especialistas (`available/*`) con guías operativas más detalladas.
- `doctor.mjs` y `smoke-test.mjs` validan el nuevo flujo y utilidades de configuración.
- Presets actualizados con soporte de carpeta de contexto.

### Documentation

- `README.md` / `README.es.md`: agent-first bootstrap, context folder y comandos.
- `docs/qa-ai/*`: arquitectura, workflow, compatibilidad de agentes y backlog.

## 0.2.0 - Workflow enhancements

Major update after the first community release. Focus: agent-first bootstrap, specialist agents, stronger validation and clearer init defaults.

### Added

- Specialist agent catalog under `.qa-ai/agents/specialists/available/` (WebdriverIO, Playwright UI/API, Cypress, Selenium, TestRail, Jira, Karate, Postman, Rest Assured, Appium and generic test design).
- Agent loading protocol in `.qa-ai/agents/README.md`.
- OSS smoke test script (`.qa-ai/scripts/smoke-test.mjs`) and `npm run qa:smoke` / `validate:oss-extraction`.
- Bilingual documentation: `README.es.md`.
- Init options reference in README (EN/ES): base templates, languages, adapters and advanced overrides.
- `.gitattributes` for consistent LF line endings.

### Changed

- **Breaking:** workflow artifacts now go to `qa-ai-output/` instead of `docs/qa/` (agents, workflows, adapters, presets and templates updated).
- `init.mjs` runs with sensible defaults and no flags; adapters are optional via `--adapters` or bootstrap scripts.
- Presets are documented as **base templates** (`--preset` kept for CLI compatibility).
- `doctor.mjs` validates specialists, smoke-test script and expanded framework checks.
- `validate-features.mjs` with stronger Gherkin convention checks.
- Claude Code and OpenCode `/qa-init`, `/qa-full-flow` and `/qa-clean` commands aligned with agent-first flow and new output paths.
- Generic `AGENTS.md` adapter reflects minimal default init vs optional adapter outputs.

### Documentation

- Restructured `README.md` with table of contents, quick start and agent-first bootstrap.
- Updated `docs/qa-ai/*` (architecture, workflow, agent compatibility, implementation guide, backlog, cleanup).

## 0.1.0 - MVP starter

Initial open-source starter package.

Included:

- Portable `.qa-ai/` folder.
- Preset-aware init, doctor, feature validation and adapter sync scripts.
- Manifest-based clean script with dry-run default and hash protection.
- Agent-first `/qa-init` bootstrap script and commands for Claude Code and OpenCode.
- Rules, agents, workflows and templates.
- Multi-agent documentation and adapters.
- Roadmap and backlog for implementation with Codex Desktop.

Refined:

- Safe no-overwrite behavior unless `--force` is passed.
- Config-aware doctor and feature validation.
- Adapter selection with default all-adapter generation.
- Init manifest tracking for generated files and adapter copies.
- Claude and OpenCode slash commands for init, full flow, doctor, clean and feature validation.
- Guided slash-command UX when commands are called without arguments.
- Copy-only bootstrap flow: copy `.qa-ai/`, run `bootstrap-agent-adapters.mjs`, then open the agent.
- End-to-end workflow documentation for folder-copy usage.
