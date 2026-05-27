---
description: Run QA FlowKit setup health checks / Ejecutar comprobaciones de QA FlowKit
---

Run the QA FlowKit doctor script and explain the results.

Read `qa-ai.config.yaml` when present and explain results in its configured interface language (`project.interfaceLanguage` / `project.defaultLanguage`, `en` or `es`).

For target-repository CI or post-flow hardening, tell the user they can run `node .qa-ai/scripts/validate-target.mjs`, which includes `doctor --strict`, feature validation, traceability validation, sync-plan validation and active-specialist validation.

Command output:

!`node .qa-ai/scripts/doctor.mjs`
