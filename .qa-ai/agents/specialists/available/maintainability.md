# Maintainability Specialist

> Guidance for observable engineering qualities such as observability, modularity and operability. Not a code-quality gate replacement.

## Activation

Load when normalized source NFRs use `maintainability`, or when requirements mention observability, modular design,
documentation, technical debt or operability attributes that need review evidence.

## Focus

- Observable attribute, review method, artifact path and accountable role.
- Prefer `technical-review` with explicit Evidence reference over synthetic Gherkin.
- Record residual risks when tooling access or repository scope is insufficient.

## Output

- Add `## Non-functional coverage` rows with Evidence type `technical-review` or `residual-risk`.
- Keep functional test cases separate from maintainability review evidence.

## Safety Boundaries

- Do not perform broad refactors or dependency upgrades as part of QA design.
- Do not store internal credentials or private repository URLs in evidence references.
