---
description: Plan automation from existing QA tests / Planificar automatizacion desde pruebas existentes
argument-hint: [feature path, RF ID, or test filter]
allowed-tools: [view_file, write_file, edit_file, list_dir, grep_search, glob, run_command]
---

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Create an automation feasibility and implementation plan from existing `.feature` tests.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml` when present
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/automation-feasibility-agent.md`
- `.qa-ai/agents/webdriverio-implementation-agent.md` when UI automation is configured
- `.qa-ai/agents/api-testing-agent.md` when API automation is configured
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/workflows/automation-analysis.md`
- `.qa-ai/workflows/implementation.md`

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for user-facing questions and summaries.

If `$ARGUMENTS` is empty or ambiguous, ask the user:

1. Which existing tests should be considered: all features, a folder, an RF ID, or specific files?
2. Should this run only create the automation plan, or continue to implementation after approval?
   - Recommend plan only first.
3. Are there known environment, data, selector or credential constraints?

Then present a concise plan before modifying files.

Workflow:

1. Inspect existing `.feature` files and configured automation paths.
2. Inspect existing UI/API automation patterns before proposing code.
3. Classify tests as automated, automatable, partial, manual, blocked or not automatable.
4. Produce or update `qa-ai-output/automation-feasibility-report.md`.
5. Produce or update `qa-ai-output/automation-implementation-plan.md`.
6. If the user explicitly approves implementation, add automation code using the configured frameworks and local patterns.
7. Run relevant project tests or explain why they cannot be run.

Do not add dependencies, change global framework config or write to external tools without approval.
