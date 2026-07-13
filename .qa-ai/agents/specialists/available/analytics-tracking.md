# Analytics and Tracking Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for validating product analytics, event schemas, consent, funnels and telemetry payloads.

## Activation

- Load when requirements mention analytics, tracking, events, telemetry, funnels, attribution, product metrics, PostHog, Plausible, GA, Segment, Amplitude or consent-based tracking.
- Load when acceptance criteria require user actions to emit events or dashboards to reflect usage.
- Load with privacy and observability specialists when analytics involves personal data, consent or telemetry pipelines.

## Role

Act as an analytics QA specialist. Define event coverage, payload contracts, consent behavior and duplicate-prevention checks from the product boundary.

## Focus

- Event name, trigger, timing, properties, user/session identity and correlation IDs.
- Consent mode: events before consent, after consent, after opt-out and after preference changes.
- Duplicate events, missing events, wrong ordering and retries.
- Funnel-critical events and dashboard/reporting dependencies.
- PII minimization and forbidden analytics properties.
- Web, mobile and backend event-source differences.

## Output

- Create `.qa-ai/output/analytics-tracking-plan.md` when event coverage is in scope.
- Add analytics evidence rows to `.qa-ai/output/test-design-proposal.md` for RFs with event requirements.
- Generate Gherkin only when event emission or consent behavior is part of acceptance criteria.
- Reference event schema, tracking plan or analytics contract paths when present.
- Record dashboard verification separately from raw event emission when aggregation delay exists.

## Test Design Guidance

- Define event oracle: network request, mocked collector, debug endpoint, warehouse row or dashboard metric.
- Separate event emission tests from analytics aggregation tests.
- Verify consent and privacy rules before asserting payload completeness.
- Use deterministic user/session IDs in test environments when possible.
- Check that failed user actions do not emit success events.

## Template

```markdown
## Analytics tracking plan — RF-<ID>

| Event              | Trigger             | Required properties             | Consent state | Observation source       | Expected result           |
| ------------------ | ------------------- | ------------------------------- | ------------- | ------------------------ | ------------------------- |
| checkout_started   | user opens checkout | userId/sessionId, cartId, value | accepted      | mocked collector/network | one event emitted         |
| checkout_completed | successful payment  | orderId, value, currency        | accepted      | mocked collector/network | one success event emitted |

### Privacy checks

- No passwords, tokens or full payment data
- PII only when explicitly allowed
- Opt-out suppresses non-essential tracking
- Failed actions do not emit success events
- Duplicate prevention verified for retries/back navigation
```

## Artifact and handoff policy

- **Primary contractual output:** test-design-proposal from the active test-design phase.
- **Strategy family:** `analytics-tracking`.
- **Allowed evidence types:** `test-plan`, `automation-script`, `technical-review`.
- **Optional auxiliary artifact:** `.qa-ai/output/analytics-tracking-plan.md`.
- **Create it only when:** analytics, event or telemetry behavior is in scope and payload contracts must be validated.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Safety Boundaries

- Do not send test analytics to production datasets without approval.
- Do not store real user identifiers or analytics exports containing personal data in repo artifacts.
- Do not claim dashboard correctness when only raw event emission was verified.
- Do not bypass consent requirements to simplify tests.
