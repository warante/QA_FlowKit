# Full Flow

Run this workflow when a user asks for the complete requirements-to-PR QA flow.

## QA track

Read `project.qaTrack` from `qa-ai.config.yaml`:

| Track        | Steps to run                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quick`      | Intake -> normalization -> (risk analysis if enabled) -> Gherkin (proposal + features) -> traceability -> PR -> (learning loop if enabled)                             |
| `standard`   | Full sequence below including risk analysis, system test design, test data, environments and execution phases                                                          |
| `enterprise` | Full sequence below including risk analysis, execution phases, defect triage, release gate and learning loop; then `validate-target.mjs` + `validate-release-gate.mjs` |

When unsure which track applies, run `node .qa-ai/scripts/qa-help.mjs`.

## Required inputs

- Requirement source: configured source, markdown RF/PRD or pasted requirement text.
- Official RF ID before final `.feature` generation.
- Target test management project/suite before coverage or sync planning when a tool is configured and track is not `quick`.

## Sequence (standard / enterprise)

1. Read `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/` and this workflow.
2. Produce or update `qa-ai-output/requirement-analysis.md`.
3. Stop if the official RF ID is missing.
4. **When `risk.enabled` is true:** produce `qa-ai-output/risk-analysis.md` and optionally `qa-ai-output/risk-register.md` (see `.qa-ai/workflows/risk-analysis.md`).
5. **Standard / enterprise:** produce `qa-ai-output/test-design-system.md` (see `.qa-ai/workflows/test-design-system.md`).
6. Produce `qa-ai-output/test-design-proposal.md` for the active RF/epic and ask approval before creating `.feature` files.
7. Generate one `.feature` file per approved test case in the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`).
8. Run `node .qa-ai/scripts/validate-test-design.mjs` and `node .qa-ai/scripts/validate-features.mjs`; fix issues.
9. Produce or update `qa-ai-output/test-management-coverage-analysis.md` (skip on `quick` track or when test management is disabled).
10. Produce or update `qa-ai-output/test-management-sync-plan.md`; do not write to external test management tools in the MVP (skip on `quick` track).
11. **When `testData.enabled` is true:** produce `qa-ai-output/test-data-plan.md` (see `.qa-ai/workflows/test-data.md`).
12. **When `environments.enabled` is true:** produce `qa-ai-output/environment-readiness.md` (see `.qa-ai/workflows/environment-readiness.md`).
13. Update `qa-ai-output/traceability-matrix.md`.
14. Produce or update `qa-ai-output/automation-feasibility-report.md` (skip on `quick` track).
15. Produce `qa-ai-output/automation-implementation-plan.md` and ask approval before automation code changes (skip on `quick` track).
16. Implement only approved automation changes using repository conventions (skip on `quick` track).
17. **When `execution.mode` is not `off`:** produce `qa-ai-output/execution-plan.md` and optionally `qa-ai-output/execution-summary.md` (see `.qa-ai/workflows/execution.md`).
18. **When execution produced results:** produce `qa-ai-output/result-analysis.md` and `qa-ai-output/defect-triage.md` (see `.qa-ai/workflows/result-analysis.md` and `.qa-ai/workflows/defect-triage.md`).
19. Prepare `qa-ai-output/pr-summary.md` with traceability, execution status and residual risk.
20. **Enterprise track only:** produce `qa-ai-output/release-gate.yaml` with `PASS`, `CONCERNS`, `FAIL` or `WAIVED` (see `.qa-ai/workflows/release-gate.md`).
21. **When `learningLoop.enabled` is true:** produce `qa-ai-output/learning-log.md` (see `.qa-ai/workflows/learning-loop.md`).

After each major step, run `node .qa-ai/scripts/qa-help.mjs` (or `/qa-help`) to confirm the next phase.

**Enterprise finale:**

```bash
node .qa-ai/scripts/validate-target.mjs
node .qa-ai/scripts/validate-release-gate.mjs
```

## Safety gates

- No external writes to configured external tools in the MVP.
- Do not overwrite existing files unless the user approved it or `--force` behavior is explicitly requested.
- Do not modify existing tests without approval.
- Never store credentials or secrets in repository files.
