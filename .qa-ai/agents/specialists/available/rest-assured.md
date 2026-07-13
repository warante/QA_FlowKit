# REST Assured Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for API testing with REST Assured (Java/Kotlin).

## Activation

Use when `automation.api.framework` is `rest-assured` or `restassured`.

## Role

Complements the API Testing Agent by providing REST Assured-specific patterns, builders and constraints. The API agent handles structure and workflow; this specialist handles framework-specific decisions.

## Focus

- Follow existing Java/Kotlin test, client, fixture and assertion conventions.
- Keep request builders and response models reusable but lightweight.
- Validate status, schemas or important fields according to repo patterns.
- Keep auth and test data setup explicit.
- Do not add dependencies or change build config without approval.

## Request Specification Pattern

```java
// Base specification — reuse across tests
RequestSpecification baseSpec = new RequestSpecBuilder()
    .setBaseUri(System.getenv("API_BASE_URL"))
    .setContentType(ContentType.JSON)
    .addHeader("Authorization", "Bearer " + token)
    .build();
```

## Response Validation Pattern

```java
@Test
void createOrder_shouldReturn201WithOrderId() {
    given()
        .spec(baseSpec)
        .body(orderPayload)
    .when()
        .post("/orders")
    .then()
        .statusCode(201)
        .body("id", notNullValue())
        .body("status", equalTo("pending"))
        .body("items.size()", equalTo(2));
}
```

## JSON Schema Validation

```java
@Test
void getUser_shouldMatchSchema() {
    given()
        .spec(baseSpec)
    .when()
        .get("/users/" + userId)
    .then()
        .statusCode(200)
        .body(matchesJsonSchemaInClasspath("schemas/user-response.json"));
}
```

Keep schemas in `src/test/resources/schemas/` and update them when API contracts change.

## ResponseSpecification (Reusable Assertions)

```java
ResponseSpecification successResponse = new ResponseSpecBuilder()
    .expectStatusCode(200)
    .expectContentType(ContentType.JSON)
    .expectResponseTime(lessThan(3000L))
    .build();
```

## Authentication Patterns

- Generate tokens in `@BeforeAll` or test fixtures, not inside each test.
- Use spec builders to attach auth headers consistently.
- Support multiple auth contexts (admin, user, anonymous) via parameterized specs.

## Anti-Patterns to Avoid

- Hardcoded base URLs or credentials in test classes.
- Not using spec builders — leads to repetition and fragile tests.
- Ignoring status code before validating body — always check status first.
- Overly complex JSONPath in assertions — extract to helper methods.
- Not cleaning up test data — use `@AfterEach` or `@AfterAll` for teardown.
- Testing internal implementation (database IDs) instead of API behavior.

## Test Data Management

- Use builder pattern for complex payloads (TestDataBuilder).
- Create data via API in setup, clean up via API in teardown.
- Use randomized unique values (UUID suffixes) to avoid collisions in parallel execution.

## Artifact and handoff policy

- **Primary contractual output:** implementation plan from the active API automation implementation phase.
- **Strategy family:** `rest-assured`.
- **Allowed evidence types:** `automation-script`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** REST Assured is the configured API framework and automation implementation is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Constraints

- Do not add Maven/Gradle dependencies without approval.
- Do not modify build config (`pom.xml`, `build.gradle`) without approval.
- Do not store credentials in test files or resource files.
- Use environment variables or external config for environment-specific values.
