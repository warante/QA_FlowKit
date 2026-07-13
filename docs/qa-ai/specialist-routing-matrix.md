# Specialist Routing Matrix

This document describes how QA FlowKit selects on-demand specialists from requirements, acceptance criteria, source NFR rows, project configuration and automation presets.

## Routing principles

1. Route from source evidence first: explicit NFR attributes, RF/CA wording, project support matrix, configured automation frameworks and user instructions.
2. Never infer regulated, destructive or paid external execution from keywords alone; use the specialist to create a plan or residual risk until the user approves.
3. More than one specialist may apply to the same RF/CA. For example, a localized analytics consent requirement may route to `privacy-testing`, `analytics-tracking` and `i18n-l10n`.
4. Use Gherkin only when the behavior is observable and acceptance-test-like. Use `test-plan`, `manual-charter`, `technical-review`, `automation-script` or `residual-risk` for non-functional evidence that is not a good Gherkin scenario. Do not add a new `@type:` Gherkin tag for every strategy family.
5. Keep all decisions traceable in `.qa-ai/output/test-design-proposal.md` and `.qa-ai/output/traceability-matrix.md`.
6. `mobile-advanced` routes from advanced mobile signals (permissions, offline, push, deep links, biometrics, etc.), not from Appium or Maestro framework configuration alone.

## Strategy routing table

| Signal category       | Example signals                                                                                 | Specialist(s)            | Preferred evidence                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| exploratory risk      | unknown behavior, legacy, incident, defect-prone, broad workflow, vague CA                      | `exploratory-testing`    | `manual-charter`                                                                                   |
| test data             | permissions matrix, seed, fixture, synthetic data, cleanup, historical data                     | `test-data-strategy`     | `test-plan`, `automation-script`                                                                   |
| API/service contracts | OpenAPI, schema, webhook, event, SDK, BFF, consumer/provider                                    | `contract-testing`       | `automation-script`, `test-plan`                                                                   |
| visual UI risk        | Figma, redesign, layout, responsive, screenshot, theme, design parity                           | `visual-regression`      | `automation-script`, `manual-charter`                                                              |
| data quality          | report, export, import, reconciliation, ETL, duplicate, audit data                              | `data-quality`           | `automation-script`, `test-plan`                                                                   |
| database migration    | schema, migration, backfill, rollback, index, retention migration                               | `database-migration`     | `test-plan`, `automation-script`, `residual-risk`                                                  |
| observability         | logs, metrics, traces, alerts, audit events, monitoring                                         | `observability-testing`  | `technical-review`, `automation-script`                                                            |
| post-deploy           | rollout, rollback, production smoke, synthetic, canary, feature flag                            | `post-deploy-validation` | `test-plan`, `technical-review`                                                                    |
| advanced security     | SAST, DAST, dependency, secret scan, OWASP, supply chain                                        | `advanced-security`      | `technical-review`, `automation-script`, `residual-risk`                                           |
| threat model          | STRIDE, abuse case, trust boundary, sensitive asset, attacker                                   | `threat-modeling`        | `technical-review`, `feature`                                                                      |
| performance execution | k6, JMeter, Gatling, SLA run, p95, load execution                                               | `performance-execution`  | `automation-script`                                                                                |
| resilience/chaos      | failover, timeout, retry, circuit breaker, DR, chaos                                            | `resilience-chaos`       | `test-plan`, `residual-risk`                                                                       |
| compatibility         | browser, OS, device, viewport, matrix, responsive                                               | `cross-browser-device`   | `test-plan`, `manual-charter`, `automation-script`                                                 |
| BrowserStack          | browserstack, Automate, App Automate, Sauce Labs, LambdaTest, device cloud, session video       | `browserstack-strategy`  | `automation-script`, `manual-charter`                                                              |
| localization          | language, locale, timezone, currency, date format, RTL                                          | `i18n-l10n`              | `feature`, `manual-charter`                                                                        |
| analytics             | events, tracking, funnel, telemetry, PostHog, Plausible, Segment, analytics event               | `analytics-tracking`     | `automation-script`, `feature`                                                                     |
| compliance            | audit, regulation, PCI, SOC2, ISO, eIDAS, legal control                                         | `compliance-testing`     | `technical-review`                                                                                 |
| privacy               | PII, GDPR, consent, cookies, deletion, export, biometrics                                       | `privacy-testing`        | `feature`, `technical-review`, `automation-script`                                                 |
| mobile advanced       | permissions, offline, push notification, deep link, biometric, camera, geolocation, app upgrade | `mobile-advanced`        | `feature`, `manual-charter`, `automation-script`, `test-plan`, `technical-review`, `residual-risk` |

When `browserstack` or `device cloud` appears with compatibility signals, the router may also suggest `cross-browser-device` in addition to `browserstack-strategy`.

## Critical signals (strict mode)

When `testDesign.strategyRouting.mode` is `strict`, `validate-strategy-routing.mjs` requires a `## Strategy routing decisions` row for each keyword route whose matched signal is listed in `testDesign.strategyRouting.criticalSignals`.

Default critical signals (when `criticalSignals` is omitted):

- `gdpr`
- `browserstack`
- `openapi`
- `sast`
- `dast`

Set `criticalSignals: []` to disable additional critical-signal enforcement while still validating table structure and evidence types in strict mode.

`advisory` and `off` never block on critical signals.

## Per-criterion routing output

Add or extend the proposal with a section like this:

```markdown
## Strategy routing decisions

| RF     | Criterion IDs | Signal              | Specialist(s)         | Decision   | Evidence type     | Rationale                                         |
| ------ | ------------- | ------------------- | --------------------- | ---------- | ----------------- | ------------------------------------------------- |
| RF-101 | CA-101-1      | login + audit event | observability-testing | applicable | automation-script | audit event is an observable acceptance criterion |
```

Use one canonical evidence type per row. Add a `Supporting evidence` column in specialist templates when complementary artifacts are needed.

## Implementation notes

- `project-config.mjs` keeps the deterministic specialist catalog.
- `.qa-ai/scripts/lib/test-strategy-router.mjs` maps normalized requirements, NFR attributes and keyword signals to candidate specialists.
- The orchestrator loads selected specialists before system and per-RF test design.
- `validate-strategy-routing.mjs` enforces `## Strategy routing decisions` when `testDesign.strategyRouting.mode` is `strict`.
- Standard automation presets (`qaTrack: standard`) ship with `testDesign.strategyRouting.mode: advisory`; `manual-only` (`qaTrack: quick`) ships with `off`.
- `.qa-ai/contracts/agent-guidance.v1.json` registers all 42 specialist IDs, routing signals and artifact policies.
  Runtime selection remains owned by `project-config.mjs` and `test-strategy-router.mjs`; the manifest is validated
  against those production catalogs and never replaces them.
- Source tests require a positive and negative production-router case for every registered specialist, plus composition,
  precedence and no-match coverage.

## Routing precedence

When multiple routing sources activate simultaneously, the following precedence applies (highest first):

1. **Explicit user instruction** — the user names one or more specialists. The orchestrator loads exactly those
   specialists and skips automatic routing for that RF/CA.
2. **Config-driven activation** — `specialistCatalog` entries with `always: true` in `project-config.mjs` are loaded
   unconditionally (framework/tool specialists).
3. **NFR attribute routing** — normalized requirement rows with source NFR attributes (e.g. `performance`, `security`,
   `privacy`) activate their corresponding strategy specialists.
4. **Keyword signal routing** — RF/CA wording that matches registered `routingSignals` activates the associated
   specialist. Keyword routing respects signal counts: when more than one keyword matches, the specialist with the
   highest unique-signal count is prioritized.
5. **Advisory-only signals** — when `testDesign.strategyRouting.mode` is `advisory`, the router recommends specialists
   but does not require `## Strategy routing decisions` rows.

## Explicit specialist selection

When the user or config explicitly selects a specialist, the router:

- Loads the named specialist regardless of keyword or NFR signals.
- Still checks `agent-guidance.v1.json` to validate that the specialist ID is registered and has the correct
  `strategyFamily`.
- Does not suppress other non-overlapping strategy specialists that are independently activated.

## Cache semantics

`specialists/active.md` is a generated cache for Markdown-only hosts. It is not the runtime source of truth:

- Regenerate it through `init.mjs` or `config.mjs --import` after changing the specialist configuration.
- Never edit `active.md` manually — manual edits are overwritten on the next regeneration.
- Source-repository validation (`validate-active-specialists.mjs`) checks consistency between `active.md` and
  configured specialists, but the production router reads from `project-config.mjs` and
  `test-strategy-router.mjs`, not from the cache file.
- When `active.md` is missing or stale, the orchestrator warns and continues from runtime routing; do not block
  workflow execution on a missing cache file.
