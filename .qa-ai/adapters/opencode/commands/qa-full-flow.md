---
description: Guided full QA AI Starter workflow
argument-hint: [optional requirement source]
---

Run the complete QA AI workflow for a Jira story, Confluence page, Markdown PRD/RF or pasted requirement.

Read these files first:

- `AGENTS.md`
- `qa-ai.config.yaml`
- `.qa-ai/rules/`
- `.qa-ai/workflows/full-flow.md`

If `$ARGUMENTS` is empty or the requirement source is ambiguous, ask the user:

1. Where is the requirement source?
   - Example: `docs/prd.md`, `docs/PRD/checkout.md`, pasted text, Jira story ID or Confluence page reference.
2. What is the official RF ID?
   - If missing, say final `.feature` generation will pause until it is provided.
3. What TestRail project should be used for coverage/sync planning?
   - If unknown, produce local placeholder analysis and mark the decision as pending.
4. Should this run produce only proposal artifacts first, or continue to `.feature` generation after approval?
   - Recommend proposal artifacts first.

Then present a concise plan before modifying files.

Expected local artifacts:

- `docs/qa/requirement-analysis.md`
- `docs/qa/testrail-coverage-analysis.md`
- `docs/qa/test-design-proposal.md`
- `.feature` files under the configured feature path after approval
- `docs/qa/testrail-sync-plan.md`
- `docs/qa/traceability-matrix.md`
- `docs/qa/automation-feasibility-report.md`
- `docs/qa/automation-implementation-plan.md`
- `docs/qa/pr-summary.md`

After feature changes, run:

```bash
node .qa-ai/scripts/validate-features.mjs
```

Do not write to Jira, Confluence, TestRail or GitHub. Ask for the official RF ID before final feature generation if it is missing.
