# RF-101 Quick-Path Demo

This is the static, reproducible demo for QA FlowKit's five-minute path. It uses no external services, credentials or
model execution.

## Story

Input:

```text
RF-101: A registered user can sign in with a valid email address and password.
Acceptance criterion: Valid credentials open the account dashboard.
```

Workflow:

```text
clean init
  -> requirements intake
  -> normalization
  -> Gherkin validation fails because @manual is missing
  -> feature corrected
  -> traceability
  -> PR summary
  -> strict validate-target passes
```

## Run it

From the QA FlowKit source repository:

```bash
npm run test:e2e-quick
```

Expected summary:

```text
[PASS] clean quick-track target initialized
[PASS] intentional missing @manual tag was rejected
[PASS] corrected Gherkin passed
[PASS] completed run and strict target validation
Quick path E2E passed in <duration>ms.
```

The exact public input and outputs live under [`test/fixtures/quick-path/`](../../test/fixtures/quick-path/). The runner
is [`.github/scripts/run-quick-path-validation.mjs`](../../.github/scripts/run-quick-path-validation.mjs).

## What this demonstrates

- The workflow can start from a clean target repository.
- State persists across phase commands.
- A deterministic validator rejects invalid AI output.
- The same phase can be corrected and resumed.
- Final Gherkin and traceability pass the strict target gate.
- No Jira, TestRail, network service or secret is required.

This static walkthrough is the accessible fallback for the short recorded demo planned before `1.0.0`.
