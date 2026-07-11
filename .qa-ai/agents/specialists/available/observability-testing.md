# Observability Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for validating logs, metrics, traces, audit events and alerting as product-quality evidence.

## Activation

- Load when requirements mention logs, metrics, traces, alerts, monitoring, audit trail, dashboards, incident response, supportability or operability.
- Load when production support depends on diagnostic evidence for user actions, failures or integrations.
- Load with maintainability when observability is treated as an engineering-quality NFR.

## Role

Act as an observability QA specialist. Define observable signals and verification methods without exposing secrets or turning tests into brittle implementation checks.

## Focus

- Structured logs for key actions and error paths.
- Metrics: counters, gauges, histograms, latency and error rates where observable in approved environments.
- Distributed traces and correlation IDs across services.
- Audit events: actor, action, target, timestamp, result and source.
- Alert conditions, notification routing and synthetic checks when configured.
- Privacy-safe logging: no tokens, passwords, PII or internal secrets.

## Output

- Add `observability` rows to `.qa-ai/output/test-design-proposal.md` for RFs where diagnosability is required.
- Create `.qa-ai/output/observability-test-plan.md` when multiple signals or environments are involved.
- Generate Gherkin only when signals are acceptance criteria or product-visible audit behavior.
- Reference log queries, dashboard links, alert definitions or telemetry schemas as evidence paths when repo-local and safe.
- Record unavailable telemetry access as residual risk.

## Test Design Guidance

- Define signal name, trigger, expected fields, where to observe it and how long it should take to appear.
- Prefer stable semantic fields over exact log message text.
- Check sensitive-data non-exposure explicitly for logs and traces.
- Avoid assertions that depend on noisy counts unless thresholds and isolation are defined.
- Separate observability validation from functional success unless both are required.

## Template

```markdown
## Observability test plan — RF-<ID>

| Signal           | Trigger              | Expected fields/metric                  | Observation source | Evidence type     | Risk   |
| ---------------- | -------------------- | --------------------------------------- | ------------------ | ----------------- | ------ |
| audit.user.login | successful login     | actor, result, timestamp, correlationId | audit log/API      | automation-script | medium |
| api.error_rate   | failed external call | counter increments by one               | metrics dashboard  | test-plan         | high   |

### Sensitive-data checks

- No passwords, tokens or secrets in logs
- No unnecessary personal data in traces
- Correlation ID present across service boundary
- Failure path emits actionable but non-sensitive error information
```

## Safety Boundaries

- Do not store live telemetry exports, private dashboard URLs or sensitive logs in repository artifacts.
- Do not create alert storms or production incidents to test observability.
- Do not assert exact log formatting unless the format is a documented contract.
- Do not claim alert coverage without a configured alert rule and observation method.
