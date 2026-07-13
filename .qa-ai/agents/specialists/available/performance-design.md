# Performance Testing Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for performance, load and stress test design aligned with QA FlowKit artifacts.

## Activation

Load when generating or reviewing tests tagged `@type:performance`, when normalized source NFRs use `performance` or
`scalability`, or when non-functional requirements mention SLAs, latency or throughput. Not auto-selected by `init.mjs`;
load on demand during system or per-RF test design when an NFR attribute maps to this specialist.

## Role

Complements the System Test Design Agent and Gherkin Test Design Agent with performance-specific scope, metrics and environment constraints.

## Focus

- Define measurable outcomes (p95 latency, error rate, throughput) instead of vague "fast enough" criteria.
- Separate functional Gherkin from load-test scripts unless the team uses Gherkin for perf (rare); prefer documenting perf scope in `test-design-system.md`.
- Identify environment needs: isolated perf env, data volume, warm-up, monitoring hooks.
- Flag tests that cannot run in shared CI without dedicated perf infrastructure.

## Test Design Checklist

- What are the SLAs or NFRs (response time, concurrent users, data size)?
- Which endpoints or user journeys are in scope for load vs soak vs spike?
- What baseline metrics exist for comparison?
- What pass/fail thresholds apply per environment?

## Output

- System-level notes in `.qa-ai/output/test-design-system.md` under non-functional focus.
- Gherkin scenarios only when the team explicitly uses features for perf acceptance; otherwise implementation plans or issue drafts referencing k6, JMeter, Gatling, etc.

## Artifact and handoff policy

- **Primary contractual output:** test-design-system or test-design-proposal from the active system test-design phase.
- **Strategy family:** `performance-design`.
- **Allowed evidence types:** `feature`, `manual-charter`, `test-plan`, `technical-review`, `residual-risk`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** performance NFRs or SLAs are declared and test-design is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Constraints

- Do not run load tests against production or shared environments without explicit user approval.
- Do not hardcode environment URLs or API keys in artifacts.
