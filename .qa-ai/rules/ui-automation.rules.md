# UI Automation Rules

**Enforced by:** prompt-only

Apply to UI and E2E automation regardless of framework (WebdriverIO, Playwright, Cypress, Selenium, Appium, etc.).

## Framework

- Use the UI/E2E framework configured in `qa-ai.config.yaml` (`automation.ui.framework`).
- For mobile UI, follow `automation.mobile.framework`, [mobile-automation.rules.md](mobile-automation.rules.md) and
  the active mobile specialist.
- If the framework is `none`, `undecided` or missing, produce an implementation plan and keep tests manual or blocked until decided.

## Implementation

- Follow existing repository patterns.
- Reuse page objects, helpers and fixtures when possible.
- Create new page objects only when needed.
- Do not change global framework config (wdio.conf, playwright.config, etc.) without approval.
- Prefer stable selectors and accessibility attributes.
- Keep tests isolated and deterministic.
- Do not store credentials in config or test files.

## Relationship to other rules

- General automation principles: [automation.rules.md](automation.rules.md).
- Gherkin source tests: [gherkin.rules.md](gherkin.rules.md).
