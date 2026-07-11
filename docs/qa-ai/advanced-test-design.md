# Advanced Test Design

QA FlowKit supports configurable cross-feature coverage obligations, traceable test-design techniques, functional
security review and mixed-source intake. These capabilities are additive: existing repositories keep their current
behavior until they enable the relevant configuration.

## Coverage policy

```yaml
testDesign:
  coverage:
    mode: advisory
    requirePositive: true
    requireNegative: true
    requireAlternative: true
    requireBoundaryWhenApplicable: true
    requireAccessibilityWhenApplicable: false
    requirePerformanceWhenApplicable: false
    requireSecurityReview: false
    requireTechniqueTraceability: false
```

- `off`: do not evaluate cross-feature obligations.
- `advisory`: report warnings without failing validation.
- `strict`: fail when configured obligations lack evidence or a not-applicable rationale.

Run:

```bash
npx qa-flowkit validate-test-coverage
npx qa-flowkit validate-test-coverage --mode strict --json
```

The validator groups `.feature` files by RF and combines their tags with
`.qa-ai/output/test-design-proposal.md`. Declare conditional obligations in:

```markdown
## Coverage obligations

| RF     | Obligation    | Applicable | Evidence | Rationale                       |
| ------ | ------------- | ---------- | -------- | ------------------------------- |
| RF-101 | boundary      | yes        | TC-003   | Quantity accepts values 1 to 99 |
| RF-101 | accessibility | no         |          | API-only behavior               |
```

Supported obligations are `positive`, `negative`, `alternative`, `boundary`, `accessibility`, `performance` and
`security`. Conditional obligations need evidence or a not-applicable rationale.

## Test-design techniques

Record techniques in the proposal's `Technique` column:

- `equivalence-partitioning`
- `boundary-value-analysis`
- `decision-table`
- `state-transition`
- `pairwise`
- `error-guessing`
- `use-case-testing`
- `other:<team-technique>`

A feature may include an optional supporting comment:

```gherkin
# Technique: boundary-value-analysis
```

Techniques describe how a test was derived. They do not replace `@type:`, which describes the kind of test.

## Functional security

Use `@type:security` for user-visible security behavior and place those files under `features/security/`. Load
`.qa-ai/agents/specialists/available/functional-security.md` during design.

The baseline covers authentication, authorization, user-resource isolation, sensitive-data exposure, rendered input,
file uploads, error disclosure, sessions and abuse limits. It is not penetration testing and does not establish
OWASP compliance.

## Mixed-source intake

Requirements remain authoritative. Images, PDFs, HTML, spreadsheets, URLs and design references are supporting
sources. When several source types are used, write `sources.analysisPath`:

```yaml
sources:
  main: markdown
  analysisPath: .qa-ai/output/source-analysis.md
```

The source analysis records extraction status, method, authority, agreements, contradictions and limitations. The
agent must not claim to have processed a source when the current host cannot access it.

Mixed-source intake stays inside the existing requirements-intake phase, so `workflow.v1.json` phase IDs and order do
not change.
