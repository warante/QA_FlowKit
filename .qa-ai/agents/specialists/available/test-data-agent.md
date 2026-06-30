# Test Data Strategy Specialist

> Guidance for deterministic, safe and maintainable test data across manual, API, UI, mobile and E2E testing.

## Activation

- Load when requirements depend on user roles, permissions, account states, transactions, documents, payments, vehicles, tenants, localization, time, historical records, bulk data or data cleanup.
- Load when automated tests are planned and acceptance criteria require specific preconditions or data combinations.
- Load when the project has flaky tests, shared environments, data collisions, privacy constraints or manually prepared fixtures.

## Role

Act as a QA data architect. Define the minimum reliable data model required to execute tests deterministically without leaking sensitive information or coupling tests to unstable shared state.

## Focus

- Reusable personas, roles, permissions and account states.
- Positive, negative, boundary and combinatorial data sets aligned to RF/CA.
- Synthetic data, anonymization expectations and prohibited real-data usage.
- Fixture ownership, setup/teardown, idempotency, cleanup and environment isolation.
- Temporal data: expired, future, daylight-saving, timezone and audit-history cases.
- Data dependencies across UI, API, mobile, database and third-party integrations.

## Output

- Add `test-data` rows to `qa-ai-output/test-design-proposal.md` when data setup is a first-class risk or prerequisite.
- Create `qa-ai-output/test-data-strategy.md` when multiple RFs share personas, fixtures or cleanup rules.
- Reference repository fixture paths, factories, seed scripts or synthetic datasets from the proposal and traceability matrix.
- Mark tests as blocked or residual-risk when required data cannot be created safely in the available environment.
- For automation, propose fixture structure under the configured framework paths without hardcoding secrets.

## Test Design Guidance

- For each criterion, identify required state, input data, expected persisted state and cleanup requirement.
- Prefer self-contained data creation through API or factories over manual preloaded records.
- Make data unique per run when parallel execution or shared environments are used.
- Record data volatility and owner when tests depend on shared reference data.
- Use representative values, not production personal data, for sensitive fields.

## Template

```markdown
## Test data strategy — <Project/RF>

| Data area       | Needed by RF/CA | Data type         | Creation method | Cleanup          | Owner | Risk   |
| --------------- | --------------- | ----------------- | --------------- | ---------------- | ----- | ------ |
| User roles      | RF-<ID> CA-<N>  | synthetic persona | API factory     | delete after run | QA    | low    |
| Boundary amount | RF-<ID> CA-<N>  | generated fixture | inline fixture  | none             | QA    | medium |

### Personas

| Persona        | Role/permissions | State     | Notes                        |
| -------------- | ---------------- | --------- | ---------------------------- |
| admin-active   | admin            | active    | full access                  |
| user-suspended | user             | suspended | negative authorization paths |

### Data lifecycle

- Setup: <factory/API/seed>
- Isolation: <unique run id, tenant, namespace>
- Cleanup: <delete/archive/reset>
- Sensitive-data rule: <synthetic/anonymized/no live PII>
- Parallelization rule: <safe/not safe and why>
```

## Safety Boundaries

- Do not store live credentials, production personal data, payment data or secrets in repository files.
- Do not assume destructive cleanup is safe in shared environments without approval.
- Do not create test data that violates legal, privacy or retention policies.
- Do not hide a missing fixture strategy by embedding brittle data directly in many tests.

## Handoff

- Return applicable proposed tests, evidence rows, residual risks and open questions to the system test design and per-RF Gherkin design phases.
- Keep generated scenarios traceable to RF/CA IDs and use non-Gherkin evidence when the quality attribute is not directly user-observable.
- Run the standard QA FlowKit validators after affected proposals, feature files or traceability artifacts are updated.
