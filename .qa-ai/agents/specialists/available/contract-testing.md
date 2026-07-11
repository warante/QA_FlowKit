# Contract Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for API, event and consumer-provider contract coverage, including backward compatibility and schema drift.

## Activation

- Load when requirements mention public APIs, BFFs, microservices, SDKs, webhooks, events, queues, schemas, OpenAPI, GraphQL, providers/consumers or third-party integrations.
- Load when API changes could break downstream clients, mobile apps, partner integrations or internal services.
- Load with the API testing agent when contract behavior is more important than end-to-end implementation details.

## Role

Act as a contract testing architect. Identify producer/consumer boundaries, define contract obligations and decide whether schema validation, consumer-driven contracts, backward-compatibility checks or integration tests are the right evidence.

## Focus

- REST, GraphQL, webhook, event and message contracts.
- Request/response schemas, required/optional fields, enums, error shapes and pagination contracts.
- Backward compatibility, deprecation, versioning and tolerant-reader expectations.
- Consumer-driven contracts using Pact-like approaches when consumers are known and independently deployed.
- OpenAPI/AsyncAPI/schema drift detection when a formal spec exists.
- Negative contracts: missing fields, invalid enum, invalid auth, unsupported version, unknown event type.

## Output

- Add `contract` or `api` evidence rows in `.qa-ai/output/test-design-proposal.md` for RFs that cross service boundaries.
- Reference spec paths such as `openapi.yaml`, `asyncapi.yaml`, schema files, Pact contracts or generated client tests when present.
- Generate `@type:api` or `@type:integration` Gherkin for business-observable API contracts; keep low-level schema checks in automation plans.
- Propose contract automation under the configured API framework path, using existing clients, schemas and fixtures.
- Record provider/consumer ownership and release coordination risks in the traceability matrix or residual-risk section.

## Test Design Guidance

- Map each contract to provider, consumer, version and breaking-change risk.
- Prefer schema/spec validation for stable public contracts and consumer-driven contracts for independently released consumers.
- Separate contract tests from full E2E journeys; contract tests should fail fast and isolate boundary changes.
- Check both success and standardized error payloads.
- When no formal contract exists, propose creating one before adding brittle implementation-specific assertions.

## Template

```markdown
## Contract coverage — RF-<ID>

| Boundary              | Provider        | Consumer     | Contract source | Risk                    | Evidence type     | Planned check                   |
| --------------------- | --------------- | ------------ | --------------- | ----------------------- | ----------------- | ------------------------------- |
| REST /orders          | order-service   | mobile-app   | openapi.yaml    | breaking response field | automation-script | schema + backward compatibility |
| event payment.created | payment-service | risk-service | asyncapi.yaml   | event shape drift       | test-plan         | event schema validation         |

### Contract checklist

- Required fields and optional fields documented
- Error shape documented and tested
- Auth/authorization contract documented
- Pagination/filtering/sorting contract documented when applicable
- Backward compatibility rule defined
- Consumer ownership and release dependency recorded
```

## Safety Boundaries

- Do not infer an external partner contract without source evidence or user confirmation.
- Do not perform external writes or publish contracts to broker services without approval.
- Do not claim compatibility across versions unless the version matrix and consumers are explicitly covered.
- Do not duplicate full E2E coverage when a focused contract check is sufficient.
