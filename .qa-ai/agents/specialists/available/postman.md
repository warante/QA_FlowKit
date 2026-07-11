# Postman/Newman Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for API testing with Postman collections and Newman CLI.

## Activation

Use when `automation.api.framework` is `postman` or `newman`.

## Role

Complements the API Testing Agent by providing Postman/Newman-specific patterns, variable strategies and constraints. The API agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing collection, environment and data-file conventions.
- Keep secrets out of collections and repository files.
- Prefer reusable variables and pre-request scripts only when they clarify repeated setup.
- Make assertions clear, stable and tied to acceptance criteria.
- Document Newman execution commands when tests cannot be run locally.

## Collection Structure

```
postman/
├── collections/
│   ├── RF-042-authentication.postman_collection.json
│   └── RF-015-orders.postman_collection.json
├── environments/
│   ├── local.postman_environment.json
│   └── staging.postman_environment.json
├── data/
│   └── order-test-data.json
└── README.md   (execution instructions)
```

## Variable Scopes (priority order)

1. **Data variables** — from CSV/JSON data files (highest priority in iteration).
2. **Environment variables** — environment-specific values (base URL, keys).
3. **Collection variables** — shared defaults within a collection.
4. **Global variables** — cross-collection shared values (use sparingly).

Never store secrets in collection or global variables committed to repo.

## Pre-Request Script Patterns

```javascript
// Token refresh in pre-request
if (!pm.environment.get('authToken') || tokenExpired()) {
    pm.sendRequest({
        url: pm.environment.get('baseUrl') + '/auth/token',
        method: 'POST',
        body: { mode: 'raw', raw: JSON.stringify({ ... }) }
    }, (err, res) => {
        pm.environment.set('authToken', res.json().token);
    });
}
```

Use pre-request scripts only for: auth token refresh, dynamic test data generation, timestamp/nonce creation.

## Test (Assertion) Patterns

```javascript
// Clear, tied to acceptance criteria
pm.test('RF-042 CA-1: Login returns 200 with token', () => {
  pm.response.to.have.status(200);
  const body = pm.response.json();
  pm.expect(body.token).to.be.a('string').and.not.empty;
  pm.expect(body.expiresIn).to.be.above(0);
});

pm.test('RF-042 CA-2: Invalid credentials return 401', () => {
  pm.response.to.have.status(401);
  pm.expect(pm.response.json().error).to.eql('Invalid credentials');
});
```

## Newman CI Execution

```bash
# Basic execution
newman run collections/RF-042-auth.postman_collection.json \
  -e environments/staging.postman_environment.json \
  --reporters cli,junit \
  --reporter-junit-export results/junit-report.xml

# Data-driven execution
newman run collections/RF-015-orders.postman_collection.json \
  -d data/order-test-data.json \
  -e environments/staging.postman_environment.json
```

## Anti-Patterns to Avoid

- Storing secrets (tokens, passwords, API keys) in collection or environment files committed to repo.
- Complex business logic in pre-request scripts — keep it simple, move complex logic to API-side.
- Tests that depend on execution order — each request should be independently runnable.
- Using global variables for request-specific data — scope correctly.
- Not documenting Newman execution commands — other team members need to run tests.
- Assertions that only check status code — validate response structure and business fields.

## Constraints

- Do not commit environment files with real credentials to the repository.
- Do not use Postman Cloud sync for collections that contain sensitive test configurations.
- Document Newman execution commands in the collection's README.
- Keep collections importable/exportable (do not rely on Postman-specific cloud features for execution).
