# Maintainability Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for observable engineering qualities such as observability, modularity and operability. Not a code-quality gate replacement.

## Role

Complements the System Test Design Agent and Gherkin Test Design Agent with observable engineering-quality review
evidence instead of synthetic functional tests.

## Activation

Load when normalized source NFRs use `maintainability`, or when requirements mention observability, modular design,
documentation, technical debt or operability attributes that need review evidence.

## Focus

- Observable attribute, review method, artifact path and accountable role.
- Prefer `technical-review` with explicit Evidence reference over synthetic Gherkin.
- Record residual risks when tooling access or repository scope is insufficient.

## Output

- Add `## Non-functional coverage` rows with one Evidence type per row: `technical-review` or `residual-risk`.
- Keep functional test cases separate from maintainability review evidence.

## Maintainability review template

```markdown
## Maintainability review — RF-<ID>

| Observable attribute | Review method | Artifact / evidence path | Accountable role | Evidence type    |
| -------------------- | ------------- | ------------------------ | ---------------- | ---------------- |
| Structured logging   | code review   | <path or PR link>        | <role>           | technical-review |
| Module boundaries    | design review | <ADR / doc path>         | <role>           | technical-review |

- Residual risks: <state when tooling access or repo scope is insufficient>
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-system or test-design-proposal from the active system test-design phase.
- **Strategy family:** `maintainability`.
- **Allowed evidence types:** `feature`, `manual-charter`, `test-plan`, `technical-review`, `residual-risk`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** maintainability NFRs are declared and technical-review evidence is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not perform broad refactors or dependency upgrades as part of QA design.
- Do not store internal credentials or private repository URLs in evidence references.
