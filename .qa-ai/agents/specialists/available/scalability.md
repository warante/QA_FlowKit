# Scalability Specialist

> Guidance for growth, concurrency and load-sensitive design. Not unauthorized load testing.

## Activation

Load when normalized source NFRs use `scalability` or `performance` with growth/concurrency axes, or when requirements
mention volume growth, peak load, concurrency or horizontal scaling.

## Focus

- Growth axis: users, transactions, records, regions or tenants.
- Load profile: baseline, ramp, spike and soak when relevant.
- Thresholds, resource assumptions and measurement points (start/end).
- Prefer `test-plan` or `automation-script` (k6, Gatling, etc.) when infrastructure is required.

## Output

- Record rows in `## Non-functional coverage` with Threshold / oracle and Environment or precondition.
- Separate scalability plans from functional `.feature` files unless user-visible degradation is observable.

## Safety Boundaries

- Do not execute load tests against production or shared environments without explicit approval.
- Do not invent throughput targets when the source requirement is ambiguous; ask an open question instead.
