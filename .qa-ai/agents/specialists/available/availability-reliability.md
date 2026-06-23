# Availability and Reliability Specialist

> Guidance for uptime, recovery, idempotency and fault-tolerance design. Not chaos engineering or production failover testing.

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

## Safety Boundaries

- Do not run chaos, failover or disaster-recovery drills in production or shared environments.
- Do not claim measured uptime without an approved observation method and environment.
