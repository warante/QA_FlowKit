# Test Data Workflow

Run after traceability matrix is complete when `testData.enabled` is `true`. Skipped on quick track.

## Prerequisites

- `.qa-ai/output/traceability-matrix.md` exists.
- `.qa-ai/features/` contains Gherkin feature files.
- `.qa-ai/qa-ai.config.yaml` has `testData.*` configured.

## Steps

1. Read `AGENTS.md`, `.qa-ai/qa-ai.config.yaml` and `.qa-ai/agents/test-data-planning-agent.md`.
2. Load the traceability matrix and Gherkin features.
3. Create a data inventory: list every test ID and its data requirements.
4. For each data requirement, determine type, source and sensitivity.
5. Mark sensitive data and document anonymization method.
6. Propose synthetic data generation where `testData.allowSynthetic` is `true`.
7. Document reset strategy for stateful data.
8. Write `.qa-ai/output/test-data-plan.md` with the data sets table.
9. Optionally write `.qa-ai/output/test-data-inventory.md`.
10. Run `node .qa-ai/scripts/validate-test-data-plan.mjs`.
11. Fix validation errors until the artifact passes.

## Safety

- Never access production databases or APIs.
- Never include real PII, tokens or credentials.
- Production data copies require `testData.allowProductionCopies: true` and anonymization documentation.
- All data paths must stay within the repository root.
