# Resilience and Chaos Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for controlled failure-injection, failover, retry and disaster-recovery validation in approved environments.

## Activation

- Load when requirements mention resilience, chaos, failover, disaster recovery, circuit breaker, retry, timeout, fallback, degradation, high availability, queues or distributed systems.
- Load after availability/reliability design when the project has an approved non-production environment for controlled failure scenarios.
- Load with observability and post-deploy specialists when resilience validation depends on alerts, metrics or incident runbooks.

## Role

Act as a resilience QA specialist. Define safe failure scenarios, blast radius, expected recovery and evidence for systems that must tolerate partial failure.

## Focus

- Failure modes: dependency outage, timeout, slow response, queue backlog, duplicate event, network partition, node restart and storage unavailability.
- Expected behavior: retry, idempotency, fallback, degraded mode, user messaging, compensation and final consistency.
- Blast radius, safety controls, abort conditions and environment approval.
- Observability during failure: logs, metrics, traces, alerts and runbooks.
- Recovery verification and data consistency after fault removal.

## Output

- Create `.qa-ai/output/resilience-test-plan.md` for approved controlled failure scenarios.
- Add `resilience` or `availability-reliability` rows to `.qa-ai/output/test-design-proposal.md`.
- Generate Gherkin only for user-observable degraded behavior or recovery outcomes.
- Reference chaos/failure-injection scripts only when they exist in repo and approval is recorded.
- Record untestable failover/DR scenarios as residual risk with owner and closure condition.

## Test Design Guidance

- Start with the smallest safe failure that proves the requirement.
- Define blast radius, monitoring, abort criteria and rollback before execution.
- Validate final system state after recovery, not just absence of errors.
- Prefer synthetic stubs or controlled staging simulations before infrastructure-level chaos.
- Do not generalize a single component failure result to full disaster-recovery coverage.

## Template

```markdown
## Resilience test plan — RF-<ID>

| Failure scenario         | Injection method     | Expected behavior                              | Observability | Abort criteria         | Environment | Evidence       |
| ------------------------ | -------------------- | ---------------------------------------------- | ------------- | ---------------------- | ----------- | -------------- |
| Payment provider timeout | stub returns timeout | user sees retryable error, no duplicate charge | logs + metric | error rate > threshold | staging     | manual-charter |

### Safety checklist

- Approved environment: <name>
- Blast radius: <scope>
- Rollback/restore action: <action>
- Data consistency check: <oracle>
- Owner present during run: <role>
- Residual risks: <list>
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal from the active test-design phase.
- **Strategy family:** `resilience-chaos`.
- **Allowed evidence types:** `test-plan`, `manual-charter`, `automation-script`, `residual-risk`.
- **Optional auxiliary artifact:** `.qa-ai/output/resilience-test-plan.md`.
- **Create it only when:** controlled failure-injection or resilience validation is approved for a non-production environment.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not run chaos, failover or disaster-recovery drills in production without explicit written approval.
- Do not inject faults into shared systems or third-party dependencies without authorization.
- Do not store sensitive incident data or internal infrastructure secrets in repo artifacts.
- Do not claim DR certification from limited feature-level resilience tests.
