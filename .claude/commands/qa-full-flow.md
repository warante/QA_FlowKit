---
description: Guided full QA FlowKit workflow / Workflow completo guiado de QA FlowKit
argument-hint: [optional requirement source]
---

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Run the complete QA AI workflow for the configured requirement source, Markdown PRD/RF or pasted requirement.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml`
- `.qa-ai/rules/`
- `.qa-ai/agents/README.md`
- `.qa-ai/agents/qa-workflow-orchestrator.md`
- `.qa-ai/agents/specialists/active.md` when present
- `.qa-ai/workflows/full-flow.md`

For each phase, load the matching phase agent from `.qa-ai/agents/README.md` and any active specialists before producing or changing artifacts. If the current tool cannot call subagents, treat those Markdown files as required role instructions.

Use `project.interfaceLanguage` / `project.defaultLanguage` from `qa-ai.config.yaml` for user-facing questions and descriptions. Use `gherkin.language` only for generated `.feature` files. Supported values are `en` and `es`; default to `en` if the config is missing.

If `$ARGUMENTS` is empty or the requirement source is ambiguous, ask the user:

1. Where is the requirement source?
   - Example: `docs/prd.md`, `docs/PRD/checkout.md`, pasted text, configured issue ID or documentation page reference.
2. What is the official RF ID?
   - If missing, say final `.feature` generation will pause until it is provided.
3. What test management project/suite should be used for coverage/sync planning?
   - If unknown, produce local placeholder analysis and mark the decision as pending.
4. Should this run produce only proposal artifacts first, or continue to `.feature` generation after approval?
   - Recommend proposal artifacts first.

Then present a concise plan before modifying files.

When a resumable harness run is desired, start or resume it before phase work:

```bash
npx qa-flowkit run start
npx qa-flowkit run next --json
```

After producing the phase artifacts, validate and advance with:

```bash
npx qa-flowkit run check
```

If validation blocked the active phase after repeated failures, run `npx qa-flowkit run retry` after fixing artifacts,
then `run check` again.

If an active run already exists, prefer `run next` and `run check` over inferring phase state manually.

Expected local artifacts:

- `qa-ai-output/requirement-analysis.md`
- `qa-ai-output/testrail-coverage-analysis.md`
- `qa-ai-output/test-design-proposal.md`
- `.feature` files under the configured feature path after approval
- `qa-ai-output/testrail-sync-plan.md`
- `qa-ai-output/traceability-matrix.md`
- `qa-ai-output/automation-feasibility-report.md`
- `qa-ai-output/automation-implementation-plan.md`
- `qa-ai-output/pr-summary.md`

After feature and QA artifact changes, run the aggregated target-repository validator:

```bash
node .qa-ai/scripts/validate-target.mjs
```

For early/incomplete repositories, use `node .qa-ai/scripts/validate-target.mjs --allow-empty --allow-missing --no-strict-doctor`.

Do not write to configured external tools. Ask for the official RF ID before final feature generation if it is missing.

Respect `project.qaTrack` from `qa-ai.config.yaml` (see `.qa-ai/workflows/full-flow.md`).

When this workflow step completes, run `/qa-help` or `node .qa-ai/scripts/qa-help.mjs` and share the recommended next phase.
