# Playwright UI Specialist

> Framework-specific guidance for UI/E2E automation with Playwright.

## Activation

Use when `automation.ui.framework` is `playwright` or `playwright-ui`.

## Role

Complements the UI Automation Implementation Agent by providing Playwright-specific patterns, fixtures and constraints. The implementation agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing Playwright test, fixture and page-object conventions.
- Prefer locators by role, label, text or test id over brittle CSS/XPath.
- Use Playwright auto-waiting and web-first assertions instead of fixed sleeps.
- Keep browser context, auth state, fixtures and test data isolated.
- Do not change Playwright global config without approval.

## Locator Strategy (by priority)

1. `page.getByRole('button', { name: '...' })` — semantic, accessible, stable.
2. `page.getByLabel('...')` / `page.getByPlaceholder('...')` — form elements.
3. `page.getByText('...')` — visible text content.
4. `page.getByTestId('...')` — dedicated test attributes.
5. `page.locator('css=...')` — last resort for complex cases.

## Modern Fixture Pattern (POM + Fixtures)

```typescript
// fixtures.ts — compose page objects as fixtures
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';

export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

Prefer fixture-based page object injection over manual instantiation in each test.

## Authentication Pattern

```typescript
// Use storageState for cached auth across tests
const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.context().storageState({ path: authFile });
});
```

## Debugging and Traces

- Use `trace: 'on-first-retry'` in config for CI debugging.
- Use `video: 'on-first-retry'` to capture failures.
- Use `await page.pause()` during development, never commit it.
- Use `test.describe.configure({ mode: 'serial' })` only when tests genuinely depend on order.

## Anti-Patterns to Avoid

- `page.waitForTimeout(N)` — use `expect(locator).toBeVisible()` or similar assertions.
- `page.locator('.class-name')` as first choice — use semantic locators.
- Sharing page state between `test()` blocks — each test gets a fresh context by default.
- Using `{ force: true }` on clicks — fix the actionability issue instead.
- `page.$()` / `page.$$()` (ElementHandle API) — use Locator API instead.
- Manual `try/catch` around assertions — let Playwright's retry mechanism handle transient states.

## Parallel Execution

- Tests run in parallel by default. Design for isolation.
- Use `test.describe.configure({ mode: 'parallel' })` explicitly for clarity.
- Workers share nothing; avoid filesystem-based shared state.

## Constraints

- Do not modify `playwright.config.*` without approval.
- Do not add browser dependencies without approval.
- Do not use `page.evaluate()` for interactions when Locator API methods exist.
- Keep test data isolated; do not rely on shared database state between workers.
