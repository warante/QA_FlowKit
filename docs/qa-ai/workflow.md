# QA AI Workflow

## Step 1 - Requirement intake and normalization

Inputs:

- Jira story.
- Confluence page.
- Markdown PRD/RF.
- Jira attachments.

Outputs:

- `docs/qa/requirement-analysis.md`

Requirements:

- Jira story is the main source when available.
- Extract RFs and Acceptance Criteria.
- Detect ambiguity.
- Proposed inferred CA must be approved before use.

## Step 2 - Official RF ID validation

Requirements:

- An official RF ID is required.
- If missing, ask the user.
- Do not generate final tests without the official ID.

## Step 3 - TestRail coverage analysis

Outputs:

- `docs/qa/testrail-coverage-analysis.md`

Requirements:

- Ask for the TestRail project.
- Search existing tests.
- Detect duplicates.
- Compare existing coverage against RF/CA.
- Do not update existing cases without approval.

## Step 4 - Gherkin test design

Outputs:

- `.feature` files under `features/`.

Requirements:

- English only.
- One scenario per file.
- Acceptance Criteria after the Feature narrative.
- Manual tests also have feature files.
- Unit tests are excluded.

## Step 5 - TestRail sync plan

Outputs:

- `docs/qa/testrail-sync-plan.md`

Requirements:

- Show sections to create.
- Show cases to create.
- Show cases requiring update.
- Ask approval before external writes.

## Step 6 - Traceability and prioritization

Outputs:

- `docs/qa/traceability-matrix.md`

Required mapping:

```text
Jira Story -> RF -> CA -> Feature -> TestRail Case ID -> Automation Status -> Automation File
```

## Step 7 - Automation feasibility

Outputs:

- `docs/qa/automation-feasibility-report.md`

Requirements:

- Analyze repo conventions.
- Decide what is automatable.
- UI/E2E default: WebdriverIO.
- API/integration default: Playwright API.
- Provide technical proposal before coding.

## Step 8 - Implementation and validation

Requirements:

- Create new specs, page objects, helpers and fixtures when approved.
- Do not modify existing tests without approval.
- Execute tests if possible.
- If not executable, mark first execution as manual.

## Step 9 - Jira task and PR

Requirements:

- Create Jira task if automation is pending and cannot be completed.
- Open PR or prepare PR-ready branch.
- Include traceability and execution status.

## Maintenance - cleanup

Use `node .qa-ai/scripts/clean.mjs` to preview cleanup of generated files tracked in `.qa-ai/state/init-manifest.json`.

Requirements:

- Dry-run first.
- Use `--force` only after reviewing the plan.
- Do not delete modified generated files unless the user explicitly asks for `--include-modified`.
- Do not remove the copied `.qa-ai/` framework folder as part of normal cleanup.
