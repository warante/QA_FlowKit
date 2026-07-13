# Cypress Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for UI/E2E automation with Cypress.

## Activation

Use when `automation.ui.framework` is `cypress`.

## Role

Complements the UI Automation Implementation Agent by providing Cypress-specific patterns, commands and constraints. The implementation agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing Cypress specs, commands, fixtures and support file conventions.
- Prefer stable selectors (`data-cy`, `data-testid`) and custom commands only when they reduce repeated workflow noise.
- Avoid arbitrary waits; use Cypress retry behavior, `cy.intercept()` and network aliases.
- Keep tests independent and avoid leaking state between specs.
- Do not change Cypress global config without approval.

## Selector Strategy (by priority)

1. `[data-cy="..."]` or `[data-testid="..."]` (dedicated test attributes).
2. `cy.findByRole()` / `cy.findByText()` (Testing Library integration if available).
3. Semantic HTML selectors (button, input[type="..."], aria-label).
4. CSS class selectors (avoid; they change with styling).

## Command Patterns

- **Custom commands**: Use for multi-step repeated workflows (login, navigation, form fill). Keep atomic.
- **cy.intercept()**: Stub or wait for API calls to control test timing and isolate frontend.
- **cy.session()**: Cache and restore authentication state across specs. Prefer over repeated login flows.
- **Fixtures**: Use `cy.fixture()` for static test data. Keep fixtures small and focused.

## Component Testing vs E2E

- Use Cypress Component Testing for isolated component validation (faster, no server needed).
- Use E2E specs for user flows that cross multiple pages or require backend state.
- Do not mix component and E2E concerns in the same spec file.

## Anti-Patterns to Avoid

- `cy.wait(N)` with hardcoded milliseconds — use `cy.intercept()` aliases instead.
- Chaining too many assertions in one `it()` block — split into focused test cases.
- Using `cy.get()` with dynamic classes — use stable test attributes.
- Accessing `window` or DOM directly when a Cypress command exists.
- Tests that depend on execution order within a spec file.
- Using `{ force: true }` to bypass visibility — fix the UI interaction instead.

## Authentication Pattern

```javascript
// Preferred: use cy.session() for cached auth
cy.session('user', () => {
  cy.visit('/login');
  cy.get('[data-cy=email]').type(email);
  cy.get('[data-cy=password]').type(password);
  cy.get('[data-cy=submit]').click();
  cy.url().should('not.include', '/login');
});
```

## Artifact and handoff policy

- **Primary contractual output:** implementation plan from the active UI automation implementation phase.
- **Strategy family:** `cypress`.
- **Allowed evidence types:** `automation-script`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** Cypress is the configured UI framework and automation implementation is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Constraints

- Do not modify `cypress.config.*` without approval.
- Do not add plugins or dependencies without approval.
- Do not use `cy.exec()` for test setup when API commands are available.
- Keep test data isolated; do not rely on shared database state.
