---
description: Validate executable Karate feature files / Validar features ejecutables de Karate
argument-hint: [optional validator flags]
---

Validate Karate executable `.feature` files under the configured API/UI specs paths.

Read `qa-ai.config.yaml` when Karate is configured (`automation.api.framework` or `automation.ui.framework` is `karate`).
QA design features under `gherkin.featurePath` use `/qa-validate-features` instead.

```bash
node .qa-ai/scripts/validate-karate-features.mjs
```

With arguments:

```bash
node .qa-ai/scripts/validate-karate-features.mjs $ARGUMENTS
```

Explain failures and propose minimal fixes. Do not modify files without approval.
