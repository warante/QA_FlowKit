# Scalability Specialist

> Guidance for growth, concurrency and load-sensitive design. Not unauthorized load testing.

## Role

Complements the System Test Design Agent and Gherkin Test Design Agent with growth axes, load profiles and capacity
thresholds.

## Activation

Load when normalized source NFRs use `scalability` or `performance` with growth/concurrency axes, or when requirements
mention volume growth, peak load, concurrency or horizontal scaling.

Relationship to the performance specialist: load `performance.md` for latency/throughput/SLA acceptance of a given
load; load this specialist for how the system behaves as the load itself grows (capacity and horizontal scaling). When
both apply, load both and keep their rows distinct.

## Focus

- Growth axis: users, transactions, records, regions or tenants.
- Load profile: baseline, ramp, spike and soak when relevant.
- Thresholds, resource assumptions and measurement points (start/end).
- Prefer `test-plan` or `automation-script` (k6, Gatling, etc.) when infrastructure is required.

## Output

- Record rows in `## Non-functional coverage` with Threshold / oracle and Environment or precondition.
- Separate scalability plans from functional `.feature` files unless user-visible degradation is observable.

## Scalability plan template

```markdown
## Scalability plan — RF-<ID>

- Growth axis: <users | transactions | records | regions | tenants>
- Baseline -> target: <e.g. 1k -> 50k concurrent users>
- Load profile: baseline | ramp | spike | soak (select applicable)
- Threshold / oracle: <e.g. p95 < 800ms at target load, error rate < 1%>
- Resource assumptions: <nodes, replicas, DB tier>
- Environment / precondition: <isolated perf env, data volume, warm-up>
- Evidence type: test-plan | automation-script (k6/Gatling) | residual-risk
```

## Safety Boundaries

- Do not execute load tests against production or shared environments without explicit approval.
- Do not invent throughput targets when the source requirement is ambiguous; ask an open question instead.
