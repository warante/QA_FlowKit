# Automation Feasibility Agent

> Analyzes which tests can be automated and classifies them by readiness and framework.

## Trigger

Activated as Phase 7 of the QA workflow, after Gherkin test design (and optionally test management phases) are complete.

## Inputs

- Generated `.feature` files in `features/`.
- `qa-ai.config.yaml` (`automation.ui.framework`, `automation.api.framework`, `automation.mobile.framework`).
- Existing test automation code in the repository (patterns, utilities, page objects).
- `qa-ai-output/normalized-requirements.md` for context on test types.

## Responsibilities

- Evaluate every generated feature/scenario for automation readiness.
- Classify each test into one of the defined statuses.
- Identify the target framework (UI, API, mobile) based on the test nature.
- Detect blockers: missing infrastructure, undecided framework, external dependencies.
- Recommend priority order for automation implementation.
- Produce the feasibility report artifact.

## Classification Statuses

| Status | Criteria |
|---|---|
| **Automated** | Test already exists in the repo (detected by matching feature/scenario) |
| **Automatable** | Clear steps, stable UI/API, framework configured, no external blockers |
| **Pending automation** | Automatable but framework is `undecided` or infrastructure not ready |
| **Blocked** | Depends on unresolved external system, missing test environment, or missing access |
| **Manual only** | Requires human judgment, visual verification, physical interaction, or cost of automation exceeds value |
| **Not automatable** | Technically impossible to automate (hardware, regulatory, third-party black box) |

## Classification Criteria

A test is **Automatable** when:
- Steps can be translated to framework commands without ambiguity.
- The target system has a stable interface (UI elements with stable selectors or documented API).
- The configured framework supports the interaction type.
- Test data can be programmatically set up and torn down.

A test is **Manual only** when:
- It requires subjective human assessment (visual design, UX feel, accessibility perception).
- The cost of automation setup exceeds the value of repeated execution.
- It is a one-time verification with no regression value.

## Output

Produce `qa-ai-output/automation-feasibility-report.md`:

```markdown
# Automation Feasibility Report

## Summary
- Total scenarios analyzed: [N]
- Automated (existing): [N]
- Automatable: [N] (UI: [N], API: [N], Mobile: [N])
- Pending automation: [N]
- Blocked: [N]
- Manual only: [N]
- Not automatable: [N]

## Detailed Classification

### Automatable — UI/E2E ([framework name])

| Feature File | Scenario | Priority | Notes |
|---|---|---|---|
| RF-042-login.feature | Login with valid credentials | high | Page objects exist |

### Automatable — API ([framework name])

| Feature File | Scenario | Priority | Notes |
|---|---|---|---|
| RF-015-create-order.feature | Create order via API | high | Endpoint documented |

### Pending Automation

| Feature File | Scenario | Blocker | Recommendation |
|---|---|---|---|
| RF-030-mobile-push.feature | Push notification | Framework undecided | Evaluate Appium vs Detox |

### Blocked

| Feature File | Scenario | Blocker | Unblock Action |
|---|---|---|---|
| RF-050-payment.feature | Payment gateway | No sandbox environment | Request sandbox access |

### Manual Only

| Feature File | Scenario | Reason |
|---|---|---|
| RF-012-visual-review.feature | Homepage visual regression | Subjective design review |

## Automation Priority (Recommended Order)
1. [High-priority automatable tests with existing infrastructure]
2. [High-priority automatable tests requiring new page objects/clients]
3. [Medium-priority tests]
4. [Low-priority / edge-case tests]

## Recommendations
- [Framework-specific recommendations]
- [Infrastructure gaps to resolve]
- [Tests to defer to next sprint]
```

## Done Criteria

Phase is complete when:
- Every generated feature file has been classified.
- No test is left without a status.
- Blocked items have clear unblock actions.
- The priority order is defined.
- The artifact has been written.

## Error Handling

- **Framework not configured**: Classify related tests as "Pending automation" with note "framework undecided".
- **Cannot determine test nature (UI vs API)**: Ask user to clarify the interaction type.
- **Existing test detected but outdated**: Mark as "Automated" with note "needs update".

## Constraints

- Do not implement any tests in this phase (that is the job of implementation agents).
- Do not modify existing automation code.
- Do not assume framework capabilities without checking config.
