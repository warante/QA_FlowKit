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

- `qa-ai-output/test-management-coverage-analysis.md`

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

- `qa-ai-output/test-management-sync-plan.md`

Requirements:

- Show sections to create.
- Show cases to create.
- Show cases requiring update.
- Ask approval before external writes.

When `testManagementSync.mode` is `proposal-only` (the default), the workflow stops at a local proposal and never
claims that external cases were changed.

When `testManagementSync.mode` is `governed`, the harness adds three guarded phases after the sync plan:

- `sync-diff`: captures a remote snapshot and computes `qa-ai-output/test-management-sync-diff.md`.
- `sync-apply`: requires `npx qa-flowkit run approve external-write:test-management` and records the approved sync
  plan hash before any external write may be attempted by the user-approved tooling.
- `sync-verify`: validates the apply log, rollback plan and final snapshot evidence.

If the sync plan changes after `external-write:test-management` approval, the harness invalidates the approval, emits
an `approval_invalidated` event and blocks `sync-apply` until the gate is approved again.

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
- When `normalized-requirements.md` lists source non-functional requirements (NFR), ensure matching rows exist in
  `test-design-proposal.md` (`## Non-functional coverage`) and `traceability-matrix.md`
  (`## Non-functional traceability`). Source NFRs require an explicit decision even if preventive coverage flags are off.

### Gradual NFR coverage configuration

| Goal                                       | Suggested config                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Learn the workflow without blocking merges | `testDesign.coverage.mode: advisory` and `nonFunctionalCoverage.mode: inherit`                    |
| Enforce complete proposals                 | `testDesign.coverage.mode: strict` (NFR severity inherits via `inherit`)                          |
| Disable only preventive obligations        | `testDesign.coverage.mode: off` — source NFRs still warn unless `nonFunctionalCoverage.mode: off` |
| Allow documented blockers in advisory      | `nonFunctionalCoverage.allowResidualRiskInAdvisory: true` (default)                               |

Reference artifacts: [`examples/nfr-coverage-reference/`](../../examples/nfr-coverage-reference/README.md). Automated
regression fixture: `test/fixtures/nfr-coverage/`.

### Semantic criterion coverage (functional)

When requirements are normalized with atomic `Criterion ID` rows, the workflow adds deterministic gates between
`normalized-requirements.md`, `test-design-proposal.md`, generated `.feature` files and `traceability-matrix.md`.

| Artifact                                        | Contract                                                                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalized-requirements.md`                    | `Criterion ID`, `Condition or partition`, `Expected observable outcome`, `Status` (`ready`, `ambiguous`, `out-of-scope`, `pending-decision`) |
| `test-design-proposal.md` (`## Proposed tests`) | `Criterion IDs`, `Evidence type`, `Artifact path`, `Action` (`create`, `reuse`, `modify`, `pending-decision`, `not-applicable`)              |
| `.feature` files                                | `@rf:` and `@id:` matching a proposal row with `Action: create` and `Evidence type: feature`                                                 |
| `traceability-matrix.md`                        | `Criterion IDs` on functional rows; `Automation Status: proposal-only` for deferred tests                                                    |

Validators:

```bash
node .qa-ai/scripts/validate-test-design.mjs
node .qa-ai/scripts/validate-test-coverage.mjs
node .qa-ai/scripts/validate-traceability.mjs
```

Enable strict gates with `testDesign.coverage.requireCriterionCoverage: true` (or rely on `testDesign.coverage.mode: strict`
when the normalized file already lists `Criterion ID` rows). Legacy proposals without atomic criteria keep working: semantic
validation is skipped until the normalized inventory uses `Criterion ID`.

Gherkin semantic review adds the `source-criterion-alignment` rubric dimension when `testDesign.quality.mode` is
`advisory` or `gate`. Raise `testDesign.quality.minDimensionsPassed` to `8` when using the full rubric.

| Goal                                    | Suggested config                                                        |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Learn atomic coverage without blocking  | `testDesign.coverage.mode: advisory`                                    |
| Enforce proposal → feature completeness | `testDesign.coverage.mode: strict` and `requireCriterionCoverage: true` |
| Block on semantic Gherkin misalignment  | `testDesign.quality.mode: gate` and `minDimensionsPassed: 8`            |

Automated regression fixture: `test/fixtures/semantic-coverage/` (`good/` and `bad/` variants).

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
