# AGENTS.md - QA FlowKit (target repository)

This file is the generic instruction layer for all AI coding agents working in a **target repository** initialized with QA FlowKit (via `npx qa-flowkit init` or folder copy).

**Not the QA FlowKit source repo:** if you are contributing to the framework itself, read the root [AGENTS.md](https://github.com/warante/QA_FlowKit/blob/main/AGENTS.md) in the [warante/QA_FlowKit](https://github.com/warante/QA_FlowKit) repository instead.

## Project purpose

Add an AI-assisted QA workflow to an existing QA or automation repository: requirements → Gherkin tests → test-management planning → automation feasibility → implementation plans → PR-ready outputs.

## Mandatory behavior

- Read this file before making changes.
- Read `qa-ai.config.yaml` when present.
- When `knowledge.enabled` is true, read the configured QA knowledge summary and init decisions artifacts before QA workflow work.
- Read **all** shared rules before changing workflow behavior:
  - Start with [.qa-ai/rules/README.md](.qa-ai/rules/README.md) (load order and tool-agnostic index).
  - Read every `.qa-ai/rules/*.rules.md` file, or at minimum: `approval`, `workflow`, `requirements`, and `gherkin` before other phases.
- Read `.qa-ai/agents/README.md` before QA workflow work; then load the matching phase agent and active specialists listed in `.qa-ai/agents/specialists/active.md`.
- Present a plan before modifying files.
- Do not overwrite existing files unless explicitly approved or `--force` behavior is requested by the user.
- Do not create external writes to configured external tools in the MVP.
- Never store secrets in repository files.
- Keep generated artifacts open-source ready (no credentials in examples).

## QA rules (summary)

Detailed rules live under `.qa-ai/rules/`. Do not rely on this summary alone.

- Gherkin: configured `gherkin.language`; required tags `@priority:`, `@type:`, `@manual:`; recommended `@rf:`, `@id:`; see [gherkin.rules.md](.qa-ai/rules/gherkin.rules.md).
- Requirements: official RF ID before final `.feature` generation; maintain traceability matrix; see [requirements.rules.md](.qa-ai/rules/requirements.rules.md).
- Languages: `project.interfaceLanguage` for artifacts and questions; `gherkin.language` only for `.feature` files; see [workflow.rules.md](.qa-ai/rules/workflow.rules.md).

## Preferred implementation stack

- Node.js 20+.
- Native Node APIs in framework scripts where possible.
- Run validators from `.qa-ai/scripts/` after changing tests or QA artifacts.

## Target repository structure (after init)

```text
qa-ai.config.yaml
.qa-ai/
qa-ai-output/
features/
tests/
```

Optional root adapters (`.claude/`, `.opencode/`, `GEMINI.md`, etc.) when bootstrapped.

## Validation

After real QA artifacts exist:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Or run individual validators listed in [workflow.rules.md](.qa-ai/rules/workflow.rules.md).

## Completion criteria

```bash
npx qa-flowkit init
npx qa-flowkit doctor
```

Folder-copy alternative:

```bash
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

Agent-first setup: bootstrap adapters, open your coding agent, then run `/qa-init` or follow `.qa-ai/workflows/full-flow.md`.
