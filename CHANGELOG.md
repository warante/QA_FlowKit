# Changelog

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
