# Test Design Rules

**Enforced by:** validate-test-design.mjs

Apply during system-level and per-RF test design before final Gherkin generation.

## Sequence by track

- On `standard` and `enterprise` tracks, complete **system test design** first (`.qa-ai/output/test-design-system.md`) before per-RF proposals and `.feature` files.
- On `quick` track, system test design may be skipped unless the user requests it.

## Per-RF design

- Create or update `.qa-ai/output/test-design-proposal.md` (or per-RF proposal files if the project uses them) before generating `.feature` files.
- One official RF ID per design pass unless the user explicitly combines RFs.
- Search existing `.feature` files and automation tests to avoid duplicate coverage.
- Cover positive, negative and edge cases called out in normalized requirements; call out gaps explicitly.
- Apply `testDesign.coverage` from `.qa-ai/qa-ai.config.yaml`. `advisory` reports gaps without blocking; `strict` makes
  configured obligations mandatory; `off` preserves the legacy behavior.
- Record applicable coverage obligations in `## Coverage obligations`. Use an explicit rationale for
  `not-applicable` decisions.
- When `normalized-requirements.md` lists source non-functional requirements (NFR), record a matching row in
  `## Non-functional coverage` before final approval. Source NFRs require an explicit applicability decision even when
  `testDesign.coverage.requirePerformanceWhenApplicable`, `requireAccessibilityWhenApplicable` or
  `requireSecurityReview` are `false`.
- Apply `testDesign.nonFunctionalCoverage` when present. `inherit` follows `testDesign.coverage.mode`, except that
  `off` still emits advisory warnings for explicit source NFRs unless `nonFunctionalCoverage.mode` is `off`.
- Supported NFR evidence types: `feature`, `automation-script`, `manual-charter`, `test-plan`, `technical-review`,
  `residual-risk`. Do not mark a source NFR as `not configured`; use `Applicable: no` with a requirement-specific
  rationale or `residual-risk` with owner, next action and closure condition.
- Minimum design guidance when a source NFR is applicable:

  | Attribute         | Minimum design when applicable                                                                                          |
  | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
  | `security`        | protected asset, exposure boundary, observation source, non-exposure oracle; distinguish functional review from pentest |
  | `performance`     | measured operation, metric, threshold, volume/concurrency, start/end point, environment                                 |
  | `availability`    | service/window, downtime condition, observation method                                                                  |
  | `reliability`     | inducible/simulated failure, recovery, retry/idempotency, expected final state                                          |
  | `scalability`     | growth axis, load profile, thresholds, resources/environment                                                            |
  | `usability`       | user profile, task, success criterion, manual/heuristic method                                                          |
  | `accessibility`   | WCAG or assistive behavior, method and tool when available                                                              |
  | `portability`     | target platforms/environments, deployment/execution condition                                                           |
  | `compatibility`   | combination matrix and expected behavior per combination                                                                |
  | `maintainability` | observable technical attribute, review method, evidence path, owner                                                     |

- Load matching specialists from `.qa-ai/agents/specialists/available/` for detected NFR attributes even when not listed
  in `active.md`.
- Apply strategy routing from [specialist-routing-matrix.md](../../docs/qa-ai/specialist-routing-matrix.md) and
  `test-strategy-router.mjs` for RF/CA keyword signals and configured tools. One RF/CA may have multiple applicable
  specialists. Record decisions in `## Strategy routing decisions` (per-RF proposal) and `## Strategy routing overview`
  (system design). Evidence types remain `feature`, `automation-script`, `manual-charter`, `test-plan`, `technical-review`,
  `residual-risk` — do not invent new Gherkin `@type:` values for strategy-only outputs.
- Record the design technique for each proposed test when technique traceability is enabled. Supported techniques:
  equivalence partitioning, boundary value analysis, decision tables, state transitions, pairwise, error guessing
  and use-case testing. Do not place evidence types (`technical-review`, `automation-script`, `test-plan`,
  `manual-charter`, `residual-risk`) in the `Technique` column; use `Evidence type` instead.
- When `normalized-requirements.md` uses atomic `Criterion ID` rows, populate `Criterion IDs`, `Evidence type`,
  `Artifact path` and `Action` in `## Proposed tests`. A criterion with `Status: pending-decision` must not use
  `Action: create` for feature generation.
- Perform a functional security review when configured. This does not replace penetration testing or establish
  OWASP compliance.

## Relationship to other rules

- Gherkin structure and tags: [gherkin.rules.md](gherkin.rules.md).
- RF ID gate and traceability matrix: [requirements.rules.md](requirements.rules.md).
- Test management proposals: [test-management.rules.md](test-management.rules.md).

## Validation

```bash
node .qa-ai/scripts/validate-test-design.mjs
node .qa-ai/scripts/validate-test-coverage.mjs
node .qa-ai/scripts/validate-features.mjs
```

Run after updating proposals and after generating or changing `.feature` files.
