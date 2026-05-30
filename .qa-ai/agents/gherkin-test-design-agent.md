# Gherkin Test Design Agent

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Generates QA test cases as Gherkin `.feature` files from normalized requirements.

## Trigger

Activated for per-RF test design and Gherkin feature generation after requirements normalization (and after `qa-ai-output/test-design-system.md` on `standard` / `enterprise` tracks).

## Inputs

- `qa-ai-output/normalized-requirements.md` (output of normalization).
- `qa-ai-output/test-design-system.md` when present (`standard` / `enterprise`).
- `qa-ai.config.yaml` (`gherkin.language`, `gherkin.tags.required`, `gherkin.featurePath`).
- `.qa-ai/rules/` for naming and structure conventions.
- Existing `features/` directory to detect duplicates and maintain consistency.

## Responsibilities

- Generate one `.feature` file per test scenario.
- Use the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).
- Include `# language: es` header in Spanish `.feature` files.
- Apply required tags to every scenario.
- Include the configured acceptance criteria section: `Acceptance Criteria:` (en) or `Criterios de aceptación:` (es).
- Generate manual test features for criteria marked as `manual only`.
- Maintain traceability from each feature back to RF/CA via `@rf:`, `@id:`, filename and Scenario title.
- Use Background for shared preconditions within a feature only when 3+ scenarios share the same Given steps.
- Detect and avoid duplicate scenarios against existing features in the repo.
- When `@type:accessibility` or `@type:performance`, also read `.qa-ai/agents/specialists/available/accessibility.md` or `performance.md`.

## Tag Requirements

### Required (validated by `validate-features.mjs`)

Every scenario must include these tags with valid values:

| Tag          | Valid Values                                                                                                              | Source                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `@priority:` | `high`, `medium`, `low`                                                                                                   | From intake priority or user assignment               |
| `@type:`     | `functional`, `regression`, `smoke`, `e2e`, `integration`, `api`, `negative`, `edge-case`, `accessibility`, `performance` | From normalization type; drives subfolder (see below) |
| `@manual:`   | `true`, `false`                                                                                                           | From normalization manual-only flag                   |

### Recommended (traceability and deduplication)

| Tag    | Valid Values                        | Source                                            |
| ------ | ----------------------------------- | ------------------------------------------------- |
| `@rf:` | `RF-[ID]`                           | Official requirement ID                           |
| `@id:` | `TC-[N]` or test-management case ID | Test case ID for matrices and duplicate detection |

Additional optional tags: `@api`, `@ui`, `@mobile`, `@blocked`, `@wip`.

## File path and naming

**Always** write under a type subfolder (never directly in the feature root). Map tags to folder:

| Tags                                                                                        | Subfolder        |
| ------------------------------------------------------------------------------------------- | ---------------- |
| `@manual:true`                                                                              | `manual/`        |
| `@type:e2e`                                                                                 | `e2e/`           |
| `@type:integration`                                                                         | `integration/`   |
| `@type:accessibility` or `a11y`                                                             | `accessibility/` |
| `@type:api` or `@api`                                                                       | `api/`           |
| `@type:functional`, `regression`, `smoke`, `negative`, `edge-case`, `performance` (default) | `functional/`    |

```
features/<subfolder>/[RF-ID]-TC-[N]-[short-description].feature
```

- Create the subfolder if it does not exist (do not pre-create unused sibling folders).
- Use lowercase and hyphens for the description portion (3–5 words).
- Include RF and test case ID in the filename for traceability matrix linking.
- Examples: `features/functional/RF-042-TC-003-login-invalid-credentials.feature`, `features/e2e/RF-015-TC-001-checkout-happy-path.feature`.

## Output

Write `.feature` files under `gherkin.featurePath/<type-subfolder>/` (default root: `features/`)—never in the bare feature root. QA design Gherkin with acceptance criteria and required tags. Executable Karate tests are created later under `tests/karate/features/` by the API/UI implementation agents when Karate is configured.

### Example (English)

```gherkin
@priority:high @type:functional @manual:false @rf:RF-042 @id:TC-003
Feature: Login with invalid credentials
  Acceptance Criteria: RF-042 CA-3 - System rejects invalid credentials with clear message

  Scenario: RF-042 TC-003 User attempts login with wrong password
    Given the user is on the login page
    When the user enters valid email "user@example.com"
    And the user enters invalid password "wrong123"
    And the user clicks the login button
    Then the system displays error message "Invalid email or password"
    And the user remains on the login page
```

### Example (Spanish)

```gherkin
# language: es
@priority:high @type:functional @manual:false @rf:RF-042 @id:TC-003
Característica: Login con credenciales inválidas
  Criterios de aceptación: RF-042 CA-3 - El sistema rechaza credenciales inválidas con mensaje claro

  Escenario: RF-042 TC-003 Usuario intenta login con contraseña incorrecta
    Dado que el usuario está en la página de login
    Cuando el usuario ingresa email válido "user@example.com"
    Y el usuario ingresa contraseña inválida "wrong123"
    Y el usuario hace clic en el botón de login
    Entonces el sistema muestra mensaje de error "Email o contraseña inválidos"
    Y el usuario permanece en la página de login
```

## Done Criteria

Phase is complete when:

- Every normalized criterion has a corresponding `.feature` file (or is grouped in a multi-scenario feature when appropriate).
- All required tags are present and have valid values.
- Traceability is maintained (every feature traces back to RF/CA via `@rf:`, `@id:`, filename and Scenario title).
- No duplicate scenarios exist against the existing feature set.
- Files follow the naming convention.

## Error Handling

- **Criterion too vague for Gherkin**: Write a skeleton feature with `@wip` tag and note what is missing in a comment.
- **Missing RF ID**: Use `@rf:RF-PENDING-[N]` and flag to orchestrator.
- **Duplicate detected**: Report to user with existing file path; do not overwrite.
- **Language mismatch**: Always check `gherkin.language` config; never mix languages in a single file.

## Constraints

- One scenario per `.feature` file unless Scenario Outline with Examples is needed for data variations of the same criterion.
- Do not include unit-test-level scenarios.
- Do not modify existing `.feature` files without approval.
- Exclude implementation details (CSS selectors, API endpoints) from Gherkin steps.
- Feature titles may be clean human-readable names; do not require embedding the RF ID in the Feature title when `@rf:` and filename/Scenario traceability are present.
