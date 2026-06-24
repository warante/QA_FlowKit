# Test Design Workflow (per RF / epic)

Generate per-RF test proposals and Gherkin tests from approved requirements in the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).

On `standard` and `enterprise` tracks, complete [system test design](test-design-system.md) first (`qa-ai-output/test-design-system.md`).

## Rules

Read `.qa-ai/rules/test-design.rules.md`, `.qa-ai/rules/requirements.rules.md` and `.qa-ai/rules/gherkin.rules.md` (index: `.qa-ai/rules/README.md`).

## Output

- Per-RF proposal: `qa-ai-output/test-design-proposal.md`
- Feature files: `gherkin.featurePath/<type>/` (e.g. `features/functional/`), not the bare feature root

Run `node .qa-ai/scripts/validate-test-design.mjs` after updating proposals and `node .qa-ai/scripts/validate-features.mjs` after generating or changing `.feature` files.
When `testDesign.coverage.mode` is not `off`, also run
`node .qa-ai/scripts/validate-test-coverage.mjs`. Advisory mode reports gaps; strict mode blocks completion.
When `normalized-requirements.md` lists source NFRs, `validate-test-coverage.mjs` also checks `## Non-functional coverage`
and `validate-traceability.mjs` checks `## Non-functional traceability`.
When normalized criteria use `Criterion ID`, populate `Criterion IDs`, `Evidence type`, `Artifact path` and `Action` in
`## Proposed tests`, then run `validate-test-coverage.mjs` to verify proposal-to-feature completeness.
When `testDesign.quality.mode` is `advisory` or `gate`, load
`.qa-ai/agents/gherkin-quality-agent.md` after feature generation and write the report to
`testDesign.quality.reportPath` using `.qa-ai/templates/gherkin-quality-report.template.md`. Advisory mode records the
findings for review; gate mode blocks completion when fewer than `testDesign.quality.minDimensionsPassed` dimensions
pass for any evaluated feature file.
