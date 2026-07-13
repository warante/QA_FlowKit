# WebdriverIO Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for UI/E2E automation with WebdriverIO.

## Activation

Use when `automation.ui.framework` is `webdriverio` or `wdio`.

## Role

Complements the UI Automation Implementation Agent by providing WebdriverIO-specific patterns, services and constraints. The implementation agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing WebdriverIO specs, services, page objects, helpers and fixtures.
- Prefer stable selectors and accessibility attributes.
- Reuse page objects and create new ones only when needed.
- Keep tests deterministic and isolated.
- Do not change global WebdriverIO config without approval.

## Selector Strategy (by priority)

1. `[data-testid="..."]` or `[data-qa="..."]` — dedicated test attributes.
2. `aria/[label]` — accessibility-based (WDIO native aria selector).
3. `#id` — unique element IDs.
4. Semantic selectors (`button=Text`, `=Link Text`) — WDIO shorthand.
5. CSS/XPath — last resort for complex DOM.

## Page Object Pattern

```javascript
class LoginPage {
  get inputEmail() {
    return $('[data-testid="email"]');
  }
  get inputPassword() {
    return $('[data-testid="password"]');
  }
  get btnSubmit() {
    return $('[data-testid="submit"]');
  }

  async login(email, password) {
    await this.inputEmail.setValue(email);
    await this.inputPassword.setValue(password);
    await this.btnSubmit.click();
    await browser.waitUntil(async () => (await browser.getUrl()).includes('/dashboard'));
  }
}
module.exports = new LoginPage();
```

## Services Pattern

- Use `@wdio/shared-store-service` for cross-worker data sharing when needed.
- Use custom services for setup/teardown that runs once (database seeding, auth token generation).
- Keep service logic separate from test logic.

## Custom Commands

- Register in `before` hook or support files.
- Use for repeated multi-step actions (`browser.addCommand('loginAs', async (role) => {...})`).
- Keep commands thin; delegate complex logic to page objects.

## Async Handling

- WebdriverIO v8+ is fully async. Always use `await` on all WDIO commands.
- Never mix sync and async patterns.
- Use `browser.waitUntil()` for custom wait conditions instead of `browser.pause()`.

## Anti-Patterns to Avoid

- `browser.pause(N)` — use `waitUntil`, `waitForDisplayed()`, or `waitForExist()`.
- Accessing `$` without `await` — all selectors are async in v8+.
- Page objects that expose raw elements — expose action methods instead.
- Hardcoded timeouts — use config-level `waitforTimeout` and override per-command when needed.
- Tests that share browser state — each `it()` should be independent.
- Using `execute()` for interactions when WDIO commands exist.

## Artifact and handoff policy

- **Primary contractual output:** implementation plan from the active UI automation implementation phase.
- **Strategy family:** `webdriverio`.
- **Allowed evidence types:** `automation-script`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** WebdriverIO is the configured UI framework and automation implementation is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Constraints

- Do not modify `wdio.conf.*` without approval.
- Do not add services or reporters without approval.
- Do not store credentials in config files.
- Keep test data isolated; use setup/teardown hooks.
