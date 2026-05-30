# Playwright API Specialist

> Framework-specific guidance for API/integration testing with Playwright's request context.

## Activation

Use when `automation.api.framework` is `playwright-api` or `playwright`.

## Role

Complements the API Testing Agent by providing Playwright APIRequestContext-specific patterns and constraints. The API agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing Playwright request context, fixture and API client conventions.
- Keep API clients thin and reusable using custom fixtures.
- Validate status, contract-relevant response fields and important side effects.
- Keep auth, test data setup and cleanup explicit.
- Do not change global Playwright config without approval.

## APIRequestContext Pattern

```typescript
// fixtures.ts — create API client as a fixture
import { test as base } from '@playwright/test';

export const test = base.extend<{ apiClient: APIRequestContext }>({
  apiClient: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.API_BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${process.env.API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    await use(context);
    await context.dispose();
  }
});
```

## Response Validation Pattern

```typescript
test('create order returns expected structure', async ({ apiClient }) => {
  const response = await apiClient.post('/orders', { data: orderPayload });

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body).toHaveProperty('id');
  expect(body.status).toBe('pending');
  expect(body.items).toHaveLength(orderPayload.items.length);
});
```

## Schema Validation

- Use Zod, JSON Schema, or TypeScript type guards for response shape validation.
- Validate schema in a reusable helper, not inline in every test.
- Separate "contract tests" (schema shape) from "behavior tests" (business logic).

## Authentication Patterns

- Token-based: Generate token in a global setup, share via environment or fixture.
- Session-based: Create session in a `beforeAll` fixture, pass context with cookies.
- API Key: Load from environment variables, never hardcode.

## Anti-Patterns to Avoid

- Hardcoding base URLs — use `baseURL` from config or environment.
- Not disposing request contexts — always dispose in fixture teardown.
- Testing implementation details (internal IDs, database state) — test observable behavior.
- Skipping status code validation — always assert status before parsing body.
- Chaining dependent API calls without assertions between them.

## Test Data Management

- Create test data via API in setup, clean up in teardown.
- Use factory patterns for complex payloads.
- Never depend on pre-existing database state; tests must be self-contained.

## Constraints

- Do not modify `playwright.config.*` without approval.
- Do not store API tokens or credentials in test files.
- Do not run destructive operations (DELETE, PATCH) on shared environments without safeguards.
- Use environment variables for all environment-specific configuration.
