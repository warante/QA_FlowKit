# QA AI Workflow

## Optional - QA context intake

Use this before Step 1 when `knowledge.enabled` is true or when the user provides `--qa-context <path>`.

Inputs:

- Repository-local QA context folder.
- `.qa-ai/workflows/context-intake.md`.
- `.qa-ai/agents/qa-context-intake-agent.md`.

Outputs:

- `qa-ai-output/qa-knowledge-summary.md`
- `qa-ai-output/qa-init-decisions.md`

Requirements:

- Separate documented practices from inferred practices.
- Ask approval before applying inferred init defaults.
- Do not write to external tools.
- Future workflow steps must follow the approved QA context decisions unless they conflict with `.qa-ai/rules/`.

## Step 1 - Requirement intake and normalization

Inputs:

- Configured requirement source.
- Configured documentation source.
- Markdown PRD/RF.
- Requirement attachments.

Outputs:

- `qa-ai-output/requirement-analysis.md`
- `qa-ai-output/source-analysis.md` when mixed sources are used

Requirements:

- The configured requirement source is the main source when available.
- Extract RFs and Acceptance Criteria.
- Detect ambiguity.
- Proposed inferred CA must be approved before use.
- Requirements remain authoritative; design and visual inputs are supporting evidence.
- Record extraction limitations and contradictions instead of silently merging incompatible sources.

## Step 2 - Official RF ID validation

Requirements:

- An official RF ID is required.
- If missing, ask the user.
- Do not generate final tests without the official ID.

## Step 3 - Test management coverage analysis

Outputs:

- `qa-ai-output/testrail-coverage-analysis.md`

Requirements:

- Ask for the configured test management project/suite.
- Search existing tests.
- Detect duplicates.
- Compare existing coverage against RF/CA.
- Do not update existing cases without approval.

## Step 4 - Gherkin test design

Outputs:

- `.feature` files under `features/`.

Requirements:

- Use the configured Gherkin language: English (`en`) or Spanish (`es`).
- Spanish `.feature` files include `# language: es`.
- One scenario per file.
- Configured acceptance criteria label after the Feature narrative.
- Manual tests also have feature files.
- Unit tests are excluded.

## Step 5 - Test management sync plan

Outputs:

- `qa-ai-output/testrail-sync-plan.md`

Requirements:

- Show sections to create.
- Show cases to create.
- Show cases requiring update.
- Ask approval before external writes.

## Step 6 - Traceability and prioritization

Outputs:

- `qa-ai-output/traceability-matrix.md`

Required mapping:

```text
Requirement Source -> RF -> CA -> Feature -> Test Management Case ID -> Automation Status -> Automation File
```

## Step 7 - Automation feasibility

Outputs:

- `qa-ai-output/automation-feasibility-report.md`

Requirements:

- Analyze repo conventions.
- Decide what is automatable.
- UI/E2E framework: use `automation.ui.framework` from `qa-ai.config.yaml`.
- API/integration framework: use `automation.api.framework` from `qa-ai.config.yaml`.
- Provide technical proposal before coding.
- Run `validate-test-coverage.mjs` after per-RF design and feature generation when coverage mode is enabled.

## Step 8 - Implementation and validation

Requirements:

- Create new specs, page objects, helpers and fixtures when approved.
- Do not modify existing tests without approval.
- Execute tests if possible.
- If not executable, mark first execution as manual.

## Step 9 - Issue task and PR

Requirements:

- Create configured issue tracker task draft if automation is pending and cannot be completed.
- Open PR or prepare PR-ready branch.
- Include traceability and execution status.

## Maintenance - cleanup

Use `node .qa-ai/scripts/clean.mjs` to preview cleanup of generated files tracked in `.qa-ai/state/init-manifest.json`.

Requirements:

- Dry-run first.
- Use `--force` only after reviewing the plan.
- Do not delete modified generated files unless the user explicitly asks for `--include-modified`.
- Do not remove the copied `.qa-ai/` framework folder as part of normal cleanup.
