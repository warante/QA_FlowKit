# RF-101 Quick-Path Demo

This is the static, reproducible demo for QA FlowKit's five-minute path. It uses no external services, credentials or
model execution.

Machine-readable status: [`demo.v1.json`](demo.v1.json) (`static_ready` until a recording is published).

| Asset                                                           | Purpose                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| [Recording script](demo-script.md)                              | Two-minute terminal capture script for maintainers        |
| [Transcript and captions](demo-transcript.md)                   | Accessible narration, alt text and caption track          |
| [Getting started](getting-started.md#deterministic-rf-101-demo) | Evaluator-facing walkthrough                              |
| [`test/fixtures/quick-path/`](../../test/fixtures/quick-path/)  | Public RF-101 input, invalid feature and expected outputs |

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

The runner is [`.github/scripts/run-quick-path-validation.mjs`](../../.github/scripts/run-quick-path-validation.mjs).

Verification: `npm run test:product-demo`.

## What this demonstrates

- The workflow can start from a clean target repository.
- State persists across phase commands.
- A deterministic validator rejects invalid AI output.
- The same phase can be corrected and resumed.
- Final Gherkin and traceability pass the strict target gate.
- No Jira, TestRail, network service or secret is required.

## Recorded demo

A short terminal capture can be published from [`demo-script.md`](demo-script.md). Until then, this static walkthrough
and `npm run test:e2e-quick` are the supported public demo paths.
