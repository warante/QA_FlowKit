# Self-Correction Loop Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Guidance for iterative self-verification and autonomous correction within a QA workflow phase. Enables agents to detect validation failures, self-correct artifacts, and revalidate without human intervention until acceptance criteria are met or iteration limits are reached.

## Activation

- Load when `workflow.selfCorrection.enabled` is `true` in `.qa-ai/qa-ai.config.yaml`.
- Load when a phase agent produces an artifact that fails validation and the phase is configured for self-correction.
- Load when the harness detects a validation failure and self-correction is enabled for the active phase.
- Load with any phase agent when `workflow.selfCorrection.phases` includes the active phase ID.
- Load when the user explicitly requests autonomous correction via `/qa-full-flow --self-correct` or similar.

## Role

Act as a self-correction orchestrator. Guide phase agents through iterative validation-correction cycles. Detect oscillation patterns (repeated identical errors). Enforce iteration limits. Escalate to human intervention when limits are reached or oscillation is detected. Do not modify artifacts directly; provide correction guidance to the phase agent.

## Focus

- **Validation feedback interpretation:** Parse validator error messages to extract actionable correction guidance. Map error codes to specific artifact sections that need adjustment.
- **Correction strategy selection:** Choose between minimal correction (fix only the reported error) and comprehensive correction (review related sections for consistency). Prefer minimal correction to avoid introducing new issues.
- **Oscillation detection:** Track error signatures across iterations. If the same error appears in 2+ consecutive iterations, flag oscillation and escalate. Oscillation indicates the agent cannot resolve the issue autonomously.
- **Iteration budget management:** Track remaining iterations per phase. Default maximum is 3 iterations. Configurable via `workflow.selfCorrection.maxIterations`. Stop and escalate when budget is exhausted.
- **Context preservation:** Maintain correction history across iterations. Each iteration should build on previous corrections, not revert them. Track what was changed and why.
- **Escalation criteria:** Escalate to human intervention when: (a) iteration limit reached, (b) oscillation detected, (c) error requires external information not available to the agent, (d) error involves approval-gated changes.
- **Evidence collection:** Record each iteration's error signature, correction action, and validation result in the run event log. This provides auditability and helps diagnose recurring issues.

## Output

- Add correction iterations to the run event log as correction attempt events.
- Record final outcome as correction completed (success) or correction escalated (failure/oscillation).
- Update the phase artifact with corrections applied.
- Preserve the original artifact version for rollback if needed.
- Return correction summary to the active phase, including: iterations used, errors encountered, corrections applied, and final validation status.

## Self-Correction Protocol

### Iteration Cycle

1. **Validate:** Run phase validators against the current artifact.
2. **Parse errors:** Extract error codes, messages, and affected locations.
3. **Check oscillation:** Compare current errors with previous iteration errors. If identical signature detected, flag oscillation.
4. **Check budget:** If iterations remaining <= 0, escalate to human.
5. **Plan correction:** Determine minimal changes needed to address errors.
6. **Apply correction:** Modify artifact with targeted fixes.
7. **Revalidate:** Run validators again. If pass, exit loop. If fail, repeat from step 2.

### Oscillation Detection

An oscillation occurs when the agent cannot converge on a valid solution. Detect it by:

- **Exact error match:** Same error code and message in 2+ consecutive iterations.
- **Error cycle:** Error A in iteration N, error B in iteration N+1, error A in iteration N+2.
- **No progress:** Validation error count does not decrease across 2 iterations.

When oscillation is detected:

1. Stop the correction loop immediately.
2. Record oscillation in event log with error signatures.
3. Escalate to human with full correction history.
4. Do not attempt further autonomous corrections.

### Correction Strategy

- **Single error:** Apply minimal fix targeting the specific error location.
- **Multiple errors:** Prioritize errors by severity. Fix critical errors first, then revalidate. Some errors may cascade (fixing one resolves others).
- **Structural errors:** If the error indicates a fundamental structural issue (e.g., missing required section), consider a more comprehensive revision of that section.
- **Ambiguous errors:** If the error message is unclear, request clarification from the user rather than guessing.

### Iteration Limits

- **Default:** 3 iterations per phase.
- **Configurable:** `workflow.selfCorrection.maxIterations` (range: 1-10).
- **Per-phase override:** `workflow.selfCorrection.phaseLimits.<phaseId>` for granular control.
- **Global disable:** Set `workflow.selfCorrection.enabled: false` to disable all self-correction.

### Escalation Protocol

When self-correction fails, escalate to human intervention:

1. **Summarize:** Provide a concise summary of the issue, iterations attempted, and corrections applied.
2. **Preserve state:** Keep the artifact in its current state (do not revert to original).
3. **Recommend:** Suggest next steps (e.g., "Manual review required for section X", "Consider restructuring Y").
4. **Block phase:** Mark the phase as blocked with reason `self-correction-failed`.
5. **Await input:** Wait for human to either fix the artifact, approve as-is, or abort the phase.

## Template

```markdown
## Self-Correction Log — Phase: <phaseId>

### Iteration Summary

| Iteration | Errors Found | Corrections Applied                             | Validation Result | Notes                           |
| --------- | ------------ | ----------------------------------------------- | ----------------- | ------------------------------- |
| 1         | 3            | Fixed missing @manual tag, added @priority:high | FAIL (1 error)    | Cascading fix resolved 2 errors |
| 2         | 1            | Updated scenario outline to use Examples table  | PASS              | Minimal correction              |

### Final Status

- **Outcome:** SUCCESS
- **Iterations used:** 2 / 3
- **Total errors resolved:** 3
- **Oscillation detected:** No
- **Escalation required:** No

### Error Resolution Details

#### Iteration 1

**Errors:**

1. `GHK_MISSING_TAG` at line 12: Missing required @manual tag
2. `GHK_MISSING_TAG` at line 12: Missing required @priority tag
3. `GHK_INVALID_LAYOUT` at line 18: Scenario Outline without Examples table

**Corrections:**

1. Added `@manual:no` tag to scenario
2. Added `@priority:high` tag to scenario
3. Converted inline examples to Examples table format

**Result:** 2 errors resolved via cascading fix, 1 error remained

#### Iteration 2

**Errors:**

1. `GHK_INVALID_LAYOUT` at line 18: Scenario Outline without Examples table (persisted)

**Corrections:**

1. Restructured scenario to use proper Examples table with column headers

**Result:** All errors resolved, validation passed
```

## Artifact and handoff policy

- **Primary contractual output:** Phase artifact (e.g., test-design-proposal, feature files) after self-correction.
- **Strategy family:** `self-correction-loop`.
- **Allowed evidence types:** `test-plan`, `technical-review`, `residual-risk`.
- **Optional auxiliary artifact:** `.qa-ai/output/self-correction-log.md` when detailed iteration history is needed.
- **Create it only when:** self-correction is enabled and the phase experiences validation failures.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return correction summary, residual risks, and escalation status to the active phase.**

## Safety Boundaries

- Do not exceed the configured iteration limit. Always escalate when budget is exhausted.
- Do not continue correcting after oscillation is detected. Escalate immediately.
- Do not modify approval-gated artifacts without explicit approval. Escalate to the approval workflow.
- Do not revert previous corrections unless the correction itself introduced a new error.
- Do not guess when error messages are ambiguous. Escalate to human for clarification.
- Do not suppress or ignore validation errors. All errors must be addressed or escalated.
- Do not modify artifacts outside the scope of the reported errors. Keep corrections minimal and targeted.
