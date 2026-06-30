# Specialist Routing Matrix

This document describes how QA FlowKit selects on-demand specialists from requirements, acceptance criteria, source NFR rows, project configuration and automation presets.

## Routing principles

1. Route from source evidence first: explicit NFR attributes, RF/CA wording, project support matrix, configured automation frameworks and user instructions.
2. Never infer regulated, destructive or paid external execution from keywords alone; use the specialist to create a plan or residual risk until the user approves.
3. More than one specialist may apply to the same RF/CA. For example, a localized analytics consent requirement may route to `privacy-testing-agent`, `analytics-tracking-agent` and `i18n-l10n-agent`.
4. Use Gherkin only when the behavior is observable and acceptance-test-like. Use `test-plan`, `manual-charter`, `technical-review`, `automation-script` or `residual-risk` for non-functional evidence that is not a good Gherkin scenario.
5. Keep all decisions traceable in `qa-ai-output/test-design-proposal.md` and `qa-ai-output/traceability-matrix.md`.

## Strategy routing table

| Signal category       | Example signals                                                             | Specialist(s)                  | Preferred evidence                                       |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| exploratory risk      | unknown behavior, legacy, incident, defect-prone, broad workflow, vague CA  | `exploratory-testing-agent`    | `manual-charter`                                         |
| test data             | roles, permissions, seed, fixture, synthetic data, cleanup, historical data | `test-data-agent`              | `test-plan`, `automation-script`                         |
| API/service contracts | OpenAPI, schema, webhook, event, SDK, BFF, consumer/provider                | `contract-testing-agent`       | `automation-script`, `test-plan`                         |
| visual UI risk        | Figma, redesign, layout, responsive, screenshot, theme, design parity       | `visual-regression-agent`      | `automation-script`, `manual-charter`                    |
| data quality          | report, export, import, reconciliation, ETL, duplicate, audit data          | `data-quality-agent`           | `automation-script`, `test-plan`                         |
| database migration    | schema, migration, backfill, rollback, index, retention migration           | `database-migration-agent`     | `test-plan`, `automation-script`, `residual-risk`        |
| observability         | logs, metrics, traces, alerts, audit events, monitoring                     | `observability-testing-agent`  | `technical-review`, `automation-script`                  |
| post-deploy           | rollout, rollback, production smoke, synthetic, canary, feature flag        | `post-deploy-validation-agent` | `test-plan`, `release-gate evidence`                     |
| advanced security     | SAST, DAST, dependency, secret scan, OWASP, supply chain                    | `security-advanced-agent`      | `technical-review`, `automation-script`, `residual-risk` |
| threat model          | STRIDE, abuse case, trust boundary, sensitive asset, attacker               | `threat-modeling-agent`        | `technical-review`, `security scenario`                  |
| performance execution | k6, JMeter, Gatling, SLA run, p95, load execution                           | `performance-execution-agent`  | `automation-script`                                      |
| resilience/chaos      | failover, timeout, retry, circuit breaker, DR, chaos                        | `resilience-chaos-agent`       | `test-plan`, `residual-risk`                             |
| compatibility         | browser, OS, device, viewport, matrix, responsive                           | `cross-browser-device-agent`   | `test-plan`, `manual-charter`, `automation-script`       |
| BrowserStack          | browserstack, Automate, App Automate, device cloud, session video           | `browserstack-strategy-agent`  | `automation-script`, `manual-charter`                    |
| localization          | language, locale, timezone, currency, date format, RTL                      | `i18n-l10n-agent`              | `feature`, `manual-charter`                              |
| analytics             | events, tracking, funnel, telemetry, PostHog, Plausible, Segment            | `analytics-tracking-agent`     | `automation-script`, `feature`                           |
| compliance            | audit, regulation, PCI, SOC2, ISO, eIDAS, legal control                     | `compliance-testing-agent`     | `technical-review`, `release-gate evidence`              |
| privacy               | PII, GDPR, consent, cookies, deletion, export, biometrics                   | `privacy-testing-agent`        | `feature`, `technical-review`, `automation-script`       |

## Per-criterion routing output

Add or extend the proposal with a section like this:

```markdown
## Strategy routing decisions

| RF     | Criterion IDs | Signal              | Specialist(s)               | Decision   | Evidence type     | Rationale                                         |
| ------ | ------------- | ------------------- | --------------------------- | ---------- | ----------------- | ------------------------------------------------- |
| RF-101 | CA-101-1      | login + audit event | observability-testing-agent | applicable | automation-script | audit event is an observable acceptance criterion |
```

## Implementation notes

- `project-config.mjs` keeps the deterministic specialist catalog.
- `.qa-ai/scripts/lib/test-strategy-router.mjs` maps normalized requirements, NFR attributes and keyword signals to candidate specialists.
- The orchestrator loads selected specialists before system and per-RF test design.
- `validate-strategy-routing.mjs` enforces `## Strategy routing decisions` when `testDesign.strategyRouting.mode` is `strict`.
