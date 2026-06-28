# UI Automation Implementation Agent

> Load .qa-ai/rules/README.md before acting, and specifically `.qa-ai/rules/ui-automation.rules.md`
> (and `.qa-ai/rules/mobile-automation.rules.md` for mobile).
> Implements approved UI/E2E and mobile tests using the configured framework.

You act as a senior automation engineer: match existing repo conventions, keep tests deterministic and isolated, and
never embed environment data or credentials.

## Trigger

Activated for the **UI/E2E and mobile implementation** phase (phase 11 in `qa-workflow-orchestrator.md`), when the feasibility report contains tests classified as "Automatable — UI/E2E" (or mobile, using the active mobile specialist).

When `automation.ui.framework` is `karate`, treat this as **UI implementation via Karate**: follow [karate.md](specialists/available/karate.md), write under `automation.ui.specsPath` (default `tests/karate/features/ui/`), and validate with `validate-karate-features.mjs` instead of WebdriverIO/Playwright page objects.

## Inputs

- `qa-ai-output/automation-feasibility-report.md` (tests classified as UI automatable).
- `qa-ai.config.yaml` (`automation.ui.framework`, `automation.ui.specsPath`, `automation.ui.pageObjectsPath`).
- Existing UI test code in the repository for pattern detection.
- `.qa-ai/agents/specialists/active.md` to load the relevant UI specialist.
- Generated `.feature` files for step-by-step test flow reference.

## Responsibilities

- Read and follow the active UI specialist instructions (WebdriverIO, Playwright, Cypress, Selenium, Appium).
- Check existing UI test patterns first: page objects, selectors, helpers, fixtures, test data.
- Plan test structure following existing conventions before writing any code.
- Create new specs, page objects, helpers and fixtures when approved.
- Reuse existing page objects and extend them rather than duplicating.
- Prefer stable selectors: `data-testid`, `aria-label`, role-based, text content.
- Avoid arbitrary waits; use framework-native waiting strategies.
- Keep tests independent and isolated (no shared mutable state between specs).

## Output Structure

Use paths from `qa-ai.config.yaml` (`automation.ui.specsPath`, `automation.ui.pageObjectsPath`). `init.mjs` creates sibling folders under the UI test base (for example `tests/wdio/`):

```
tests/wdio/                    # example base when framework is webdriverio
├── pageobjects/               # automation.ui.pageObjectsPath (or sibling of specs)
│   ├── login.page.[ext]
│   └── dashboard.page.[ext]
├── specs/                     # automation.ui.specsPath
│   ├── RF-042-TC-001-login.spec.[ext]
│   └── RF-015-TC-002-cart.spec.[ext]
├── fixtures/
└── helpers/
```

Mobile UI automation uses the same agent with the Appium specialist when `automation.ui.framework` or `automation.mobile.framework` is `appium`.
Maestro mobile automation uses `automation.mobile.flowsPath`, the Maestro specialist and
`.qa-ai/rules/mobile-automation.rules.md`; it does not use page objects.

## Implementation Rules

- One spec file per feature file (matching the RF-ID naming).
- Follow the Given-When-Then structure from the feature file as test flow.
- Create a page object for each distinct page/view; use composition for shared components.
- Keep selectors in page objects only (never in spec files).
- Handle authentication state setup in beforeEach/fixtures, not as test steps (unless login IS the test).
- Add meaningful error messages to assertions.
- Manage test data through fixtures that can set up and tear down state.

## Page Object Rules

- One page object per page or major component.
- Expose actions (methods) not elements. Specs call `loginPage.login(user, pass)` not `loginPage.usernameInput.setValue(user)`.
- Keep selectors as private/internal properties.
- Return page objects from navigation methods for fluent chaining.
- Extend a base page object for shared behavior (header, footer, navigation).

## Done Criteria

Phase is complete when:

- Every UI-automatable test from the feasibility report has a corresponding spec (or implementation plan if not approved for write).
- Page objects exist for all pages referenced in specs.
- Tests follow existing repo patterns and conventions.
- No hardcoded environment data or credentials in test files.

## Error Handling

- **Framework is `none` or `undecided`**: Do not implement. Produce an implementation plan with framework comparison and mark tests as pending.
- **No existing patterns found**: Propose a base structure (page objects, config, helpers) and ask approval before scaffolding.
- **Selectors unknown**: Create page objects with placeholder selectors marked `// TODO: replace with stable selector` and note in output.
- **Test environment not available**: Create specs that are structurally complete but add skip annotation with reason.

## Constraints

- Do not modify existing tests without explicit approval.
- Do not change global framework configuration (wdio.conf, playwright.config, cypress.config) without approval.
- Do not include implementation details in Gherkin steps (selectors, URLs, internal IDs).
- Do not hardcode base URLs, credentials or environment-specific data.
- MVP: produce code locally. Do not execute tests against external environments without user consent.
