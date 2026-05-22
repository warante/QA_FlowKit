---
description: Validate QA AI Starter Gherkin feature files
argument-hint: [optional validator flags]
---

Validate QA AI Starter `.feature` files.

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
