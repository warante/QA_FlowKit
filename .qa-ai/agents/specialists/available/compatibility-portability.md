# Compatibility and Portability Specialist

> Guidance for platform, browser, device and deployment matrices. Not exhaustive matrix execution without approval.

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

## Safety Boundaries

- Do not execute deployments or cross-platform runs in production without approval.
- Do not claim full matrix coverage when only a representative subset is planned.
