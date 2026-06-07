---
description: Validate QA FlowKit Gherkin feature files / Validar archivos Gherkin de QA FlowKit
argument-hint: [optional validator flags]
---

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Validate QA FlowKit `.feature` files.

Read `qa-ai.config.yaml` when present and use its configured interface language (`project.interfaceLanguage` / `project.defaultLanguage`, `en` or `es`) for questions, descriptions and summaries. The validator itself uses `gherkin.language` for `.feature` rules.
Before proposing feature fixes, read `.qa-ai/agents/gherkin-test-design-agent.md` and `.qa-ai/agents/specialists/active.md` when present.

If `$ARGUMENTS` is empty, run the validator using the configured feature path:

```bash
node .qa-ai/scripts/validate-features.mjs
```

If the user wants a custom path, ask for it and run:

```bash
node .qa-ai/scripts/validate-features.mjs --path <feature-root>
```

If `$ARGUMENTS` is not empty, treat it as advanced mode and run:

```bash
node .qa-ai/scripts/validate-features.mjs $ARGUMENTS
```

Explain any validation failures and propose the smallest safe fixes. Do not modify feature files unless the user approves.

When feature validation passes and traceability or test-management artifacts exist, recommend the companion validators:

```bash
node .qa-ai/scripts/validate-traceability.mjs
node .qa-ai/scripts/validate-sync-plan.mjs
```
