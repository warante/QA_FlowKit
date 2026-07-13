# Compatibility and Portability Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for platform, browser, device and deployment matrices. Not exhaustive matrix execution without approval.

## Role

Complements the System Test Design Agent and Gherkin Test Design Agent with the supported combination matrix and
per-combination expectations.

## Activation

Load when normalized source NFRs use `compatibility` or `portability`, or when requirements define supported
platforms, browsers, devices, deployment targets or interoperability constraints.

## Focus

- Compatibility: combination matrix and expected behavior per combination.
- Portability: target platforms/environments and deployment/execution conditions.
- Prefer `test-plan`, `manual-charter` or `technical-review` over Gherkin when coverage is matrix-heavy.

## Output

- Record `## Non-functional coverage` rows; do not add `@type:compatibility` features unless Gherkin is explicitly the chosen evidence.
- Link matrix or plan artifacts as Evidence reference.

## Compatibility matrix template

```markdown
## Compatibility matrix — RF-<ID>

| Platform / OS | Browser / Runtime | Device / Form factor | Expected behavior | Priority | Evidence type    |
| ------------- | ----------------- | -------------------- | ----------------- | -------- | ---------------- |
| Windows 11    | Chrome latest     | Desktop              | Full support      | high     | test-plan        |
| iOS 17        | Safari            | Mobile               | Full support      | high     | manual-charter   |
| Android 14    | Chrome            | Mobile               | Degraded: <note>  | medium   | technical-review |

- Subset note: state explicitly when only a representative subset is planned.
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-system or test-design-proposal from the active system test-design phase.
- **Strategy family:** `compatibility-portability`.
- **Allowed evidence types:** `feature`, `manual-charter`, `test-plan`, `technical-review`, `residual-risk`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** compatibility or portability NFRs are declared and combination-matrix coverage is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not execute deployments or cross-platform runs in production without approval.
- Do not claim full matrix coverage when only a representative subset is planned.
