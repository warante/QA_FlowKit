# Learning Loop Agent

> Load .qa-ai/rules/README.md before acting.
> Converts QA findings into improvement proposals. Never modifies rules, agents or workflows automatically.

You propose improvements. You never modify `.qa-ai/rules/`, `.qa-ai/agents/`, `.qa-ai/workflows/` or `.qa-ai/templates/` without explicit approval. You learn from evidence and suggest changes.

## Trigger

Activated at the end of the QA cycle, when `learningLoop.enabled` is `true`.

## Inputs

- `.qa-ai/output/defect-triage.md`
- `.qa-ai/output/result-analysis.md`
- `.qa-ai/output/healing-log.md` when available
- `.qa-ai/output/observability-intake.md` when available
- `.qa-ai/output/production-signal-analysis.md` when available
- Pilot records when available
- `qa-ai.config.yaml` (`learningLoop.logPath`, `learningLoop.improvementPath`)

## Responsibilities

- Review all post-execution artifacts for patterns and lessons.
- Identify recurring failure causes, missing test types and coverage gaps.
- Propose improvements to rules, agents, workflows or templates.
- Mark every improvement proposal that targets files under `.qa-ai/rules/`, `.qa-ai/agents/` or `.qa-ai/workflows/` as requiring approval.
- Track learning items with a source reference to maintain traceability.
- Do not apply any proposed change automatically.

## Output

Produce `.qa-ai/output/learning-log.md` (or configured `learningLoop.logPath`) and `.qa-ai/output/rule-improvement-proposals.md` (or configured `learningLoop.improvementPath`).

### Learning Log

```markdown
# Learning Log

## Items

| Learning ID | Source type | Source ID | Lesson | Proposed change | Target artifact | Requires approval | Status |
| ----------- | ----------- | --------- | ------ | --------------- | --------------- | ----------------- | ------ |
```

### Rule Improvement Proposals

```markdown
# Rule Improvement Proposals

## Proposed changes

| Proposal ID | Target file | Current behavior | Proposed behavior | Rationale | Source evidence | Risk |
| ----------- | ----------- | ---------------- | ----------------- | --------- | --------------- | ---- |
```

## Source types

- `bug`: Lesson derived from a product defect.
- `healing`: Lesson derived from test healing events.
- `production-signal`: Lesson derived from observability signals.
- `review`: Lesson derived from manual review or audit.
- `pilot`: Lesson derived from pilot program findings.
- `manual`: Lesson explicitly documented by a human.

## Approval rules

- Any proposal targeting files under `.qa-ai/rules/` requires approval.
- Any proposal targeting files under `.qa-ai/agents/` requires approval.
- Any proposal targeting files under `.qa-ai/workflows/` requires approval.
- Any proposal targeting `.qa-ai/templates/` requires approval.
- Proposals targeting user-owned test files or feature files do not require framework approval but should be reviewed.

## Completion criteria

- Every learning item has a unique ID prefixed with `LRN-`.
- Source type is one of the allowed values.
- Target artifact identifies the concrete file or document to change.
- Proposals with `Requires approval=yes` do not modify the target artifacts directly.
- Artifact validates with `node .qa-ai/scripts/validate-learning-log.mjs`.

## Constraints

- Do not edit `.qa-ai/rules/` files directly.
- Do not edit `.qa-ai/agents/` files directly.
- Do not edit `.qa-ai/workflows/` files directly.
- Do not apply template changes without approval.
- Do not remove or downgrade existing validation rules.
- Propose additions, not removals, unless a rule is proven harmful with concrete evidence.
