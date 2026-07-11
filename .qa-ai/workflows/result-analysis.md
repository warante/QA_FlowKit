# Result Analysis Workflow

Run after execution when results are available. Skipped on quick track.

## Prerequisites

- `.qa-ai/output/execution-summary.md` exists with non-empty results.
- `.qa-ai/qa-ai.config.yaml` has `execution.resultsPaths` or result files generated during execution.

## Steps

1. Read `AGENTS.md`, `.qa-ai/qa-ai.config.yaml` and `.qa-ai/agents/result-analysis-agent.md`.
2. Read the execution summary and results index.
3. Parse result files from configured `execution.resultsPaths`.
4. Map each result entry to Test IDs and RFs via the traceability matrix.
5. Classify each failed, skipped or errored test:
   - Assign a failure class (`product-defect`, `test-defect`, `environment`, `test-data`, `flaky`, `unknown`).
   - Assign a confidence level (`high`, `medium`, `low`).
   - Recommend an action based on the failure class.
6. Write `.qa-ai/output/result-analysis.md` with summary and classification table.
7. Run `node .qa-ai/scripts/validate-result-analysis.mjs`.
8. Fix validation errors until the artifact passes.

## Safety

- Never modify test implementations to make failures disappear.
- Never dismiss failures without evidence.
- Every product defect must have a corresponding defect action.
- Unknown failures must be flagged for manual review.
