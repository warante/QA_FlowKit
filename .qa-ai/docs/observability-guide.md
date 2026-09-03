# Observability Guide

This guide clarifies the two facets of observability in QA FlowKit and when to use each.

## Overview

Observability in QA FlowKit covers two complementary activities:

1. **Observability Testing** (specialist) - Validates that the product emits useful logs, metrics, traces, and alerts.
2. **Observability Intake** (agent) - Analyzes production signals to detect coverage gaps and propose new tests.

Both are part of the **Observability Engineer** role. The specialist focuses on pre-release validation; the agent focuses on post-release learning.

## When to Use Each

### Observability Testing Specialist

**When to load:**

- Requirements mention logs, metrics, traces, alerts, monitoring, or audit trails.
- Production support depends on diagnostic evidence.
- Observability is treated as an engineering-quality NFR.

**What it does:**

- Defines observable signals and verification methods.
- Creates observability test plans.
- Validates that logs, metrics, and traces are emitted correctly.
- Checks for sensitive-data non-exposure in logs.

**Output:**

- `observability` rows in `test-design-proposal.md`.
- `.qa-ai/output/observability-test-plan.md` (optional auxiliary artifact).

**Example:**

```markdown
## Observability test plan — RF-042

| Signal           | Trigger              | Expected fields/metric                  | Observation source |
| ---------------- | -------------------- | --------------------------------------- | ------------------ |
| audit.user.login | successful login     | actor, result, timestamp, correlationId | audit log/API      |
| api.error_rate   | failed external call | counter increments by one               | metrics dashboard  |
```

### Observability Intake Agent

**When to load:**

- After PR summary or release gate.
- `observability.enabled` is `true`.
- Local observability source files exist (incident reports, log excerpts, metric exports).

**What it does:**

- Reads local observability sources from configured paths.
- Normalizes signals into a standard format.
- Maps signals to RF IDs from the traceability matrix.
- Identifies coverage gaps (signals without corresponding tests).
- Proposes new test cases or risk adjustments.

**Output:**

- `.qa-ai/output/observability-intake.md`.
- `.qa-ai/output/production-signal-analysis.md` (optional).

**Example:**

```markdown
## Observability Intake

| Signal ID | Source             | Date       | Area | Severity | Linked RF | Gap type     | Proposed QA action           |
| --------- | ------------------ | ---------- | ---- | -------- | --------- | ------------ | ---------------------------- |
| SIG-001   | incident-report.md | 2026-01-15 | auth | high     | RF-042    | missing-test | Add test for session timeout |
```

## Configuration

Enable observability in `.qa-ai/qa-ai.config.yaml`:

```yaml
observability:
  enabled: true
  mode: advisory # or 'strict' for enterprise track
  sourcePaths:
    - test-results/**/*.xml
    - test-results/**/*.json
  intakePath: .qa-ai/output/observability-intake.md
  signalAnalysisPath: .qa-ai/output/production-signal-analysis.md
```

## Workflow Integration

```
Pre-Release                          Post-Release
┌──────────────────────┐             ┌──────────────────────┐
│  Observability       │             │  Observability       │
│  Testing Specialist  │             │  Intake Agent        │
│                      │             │                      │
│  - Design log tests  │             │  - Analyze signals   │
│  - Validate metrics  │             │  - Map to RFs        │
│  - Check traces      │             │  - Identify gaps     │
│  - Audit events      │             │  - Propose tests     │
└──────────────────────┘             └──────────────────────┘
         │                                      │
         ▼                                      ▼
  observability-test-plan.md          observability-intake.md
```

## Safety Boundaries

Both specialist and agent:

- Do not connect to external monitoring services, APM tools, or log aggregators.
- Do not include PII, credentials, or session identifiers in artifacts.
- Only read files within configured source paths.
- Proposed changes are suggestions only; do not modify artifacts directly without approval.

## Related Specialists

- **test-intelligence** - Analyzes test execution results to classify failures and detect flakiness.
- **observability-testing** - Designs tests to validate product observability.
- **production-observability-intake-agent** - Ingests production signals and maps to coverage gaps.
