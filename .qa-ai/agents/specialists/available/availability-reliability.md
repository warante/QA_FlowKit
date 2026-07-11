# Availability and Reliability Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for uptime, recovery, idempotency and fault-tolerance design. Not chaos engineering or production failover testing.

## Role

Complements the System Test Design Agent and Gherkin Test Design Agent with uptime, recovery and fault-tolerance
scope and oracles.

## Activation

Load when normalized source NFRs use `availability` or `reliability`, or when requirements mention uptime, service
windows, retries, recovery, idempotency or fault tolerance.

## Focus

- Availability: service scope, acceptable downtime window, observation method and alert/oracle.
- Reliability: inducible or simulable failure, recovery path, retry/idempotency rules and expected final state.
- Prefer `test-plan`, `automation-script` or controlled staging simulations over artificial Gherkin when behavior is not user-visible.

## Output

- Record decisions in `## Non-functional coverage` with threshold/oracle and environment/precondition when applicable.
- Use `residual-risk` when failure injection or recovery validation needs an approved non-production environment.

## Availability / reliability plan template

```markdown
## Availability & reliability plan — RF-<ID>

- Service scope: <service or endpoint>
- Availability target: <e.g. 99.9% monthly; max downtime window>
- Observation method: <health check, synthetic monitor, alert>
- Failure scenario: <inducible/simulable failure>
- Recovery path: <retry, failover, idempotency rule>
- Expected final state: <consistent state after recovery>
- Environment / precondition: <approved non-prod environment>
- Evidence type: choose one per row — `test-plan`, `automation-script` or `residual-risk`
```

## Safety Boundaries

- Do not run chaos, failover or disaster-recovery drills in production or shared environments.
- Do not claim measured uptime without an approved observation method and environment.
