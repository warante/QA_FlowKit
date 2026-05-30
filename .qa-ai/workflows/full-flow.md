# Full Flow

Run this workflow when a user asks for the complete requirements-to-PR QA flow.

## QA track

Read `project.qaTrack` from `qa-ai.config.yaml`:

| Track        | Steps to run                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `quick`      | Intake → normalization → Gherkin (proposal + features) → traceability → PR                                  |
| `standard`   | Full sequence below including system and per-RF test design                                                 |
| `enterprise` | Full sequence below; then release gate (`/qa-gate`) and `validate-target.mjs` + `validate-release-gate.mjs` |

When unsure which track applies, run `node .qa-ai/scripts/qa-help.mjs`.

## Required inputs

- Requirement source: configured source, markdown RF/PRD or pasted requirement text.
- Official RF ID before final `.feature` generation.
- Target test management project/suite before coverage or sync planning when a tool is configured and track is not `quick`.

## Sequence (standard / enterprise)

1. Read `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/rules/` and this workflow.
2. Produce or update `qa-ai-output/requirement-analysis.md`.
3. Stop if the official RF ID is missing.
4. **Standard / enterprise:** produce `qa-ai-output/test-design-system.md` (see `.qa-ai/workflows/test-design-system.md`).
5. Produce `qa-ai-output/test-design-proposal.md` for the active RF/epic and ask approval before creating `.feature` files.
6. Generate one `.feature` file per approved test case in the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`).
7. Run `node .qa-ai/scripts/validate-test-design.mjs` and `node .qa-ai/scripts/validate-features.mjs`; fix issues.
8. Produce or update `qa-ai-output/testrail-coverage-analysis.md` (skip on `quick` track or when test management is disabled).
9. Produce or update `qa-ai-output/testrail-sync-plan.md`; do not write to external test management tools in the MVP (skip on `quick` track).
10. Update `qa-ai-output/traceability-matrix.md`.
11. Produce or update `qa-ai-output/automation-feasibility-report.md` (skip on `quick` track).
12. Produce `qa-ai-output/automation-implementation-plan.md` and ask approval before automation code changes (skip on `quick` track).
13. Implement only approved automation changes using repository conventions (skip on `quick` track).
14. Prepare `qa-ai-output/pr-summary.md` with traceability, execution status and residual risk.
15. **Enterprise track only:** produce `qa-ai-output/release-gate.yaml` with `PASS`, `CONCERNS`, `FAIL` or `WAIVED` (see `.qa-ai/workflows/release-gate.md`).

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
