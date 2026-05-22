# Full Flow

Run this workflow when a user asks for the complete requirements-to-PR QA flow.

## Required inputs

- Requirement source: Jira story, Confluence page, markdown RF/PRD or pasted requirement text.
- Official RF ID before final `.feature` generation.
- Target TestRail project before TestRail coverage or sync planning.

## Sequence

1. Read `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/` and this workflow.
2. Produce or update `docs/qa/requirement-analysis.md`.
3. Stop if the official RF ID is missing.
4. Produce or update `docs/qa/testrail-coverage-analysis.md`.
5. Produce `docs/qa/test-design-proposal.md` and ask approval before creating `.feature` files.
6. Generate one English `.feature` file per approved test case.
7. Run `node .qa-ai/scripts/validate-features.mjs` and fix generated feature issues.
8. Produce or update `docs/qa/testrail-sync-plan.md`; do not write to TestRail in the MVP.
9. Update `docs/qa/traceability-matrix.md`.
10. Produce or update `docs/qa/automation-feasibility-report.md`.
11. Produce `docs/qa/automation-implementation-plan.md` and ask approval before automation code changes.
12. Implement only approved automation changes using repository conventions.
13. Prepare `docs/qa/pr-summary.md` with traceability, execution status and residual risk.

## Safety gates

- No external writes to Jira, Confluence, TestRail or GitHub in the MVP.
- Do not overwrite existing files unless the user approved it or `--force` behavior is explicitly requested.
- Do not modify existing tests without approval.
- Never store credentials or secrets in repository files.
