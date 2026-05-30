# Test Design Workflow (per RF / epic)

Generate per-RF test proposals and Gherkin tests from approved requirements in the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).

On `standard` and `enterprise` tracks, complete [system test design](test-design-system.md) first (`qa-ai-output/test-design-system.md`).

## Rules

Read `.qa-ai/rules/test-design.rules.md`, `.qa-ai/rules/requirements.rules.md` and `.qa-ai/rules/gherkin.rules.md` (index: `.qa-ai/rules/README.md`).

## Output

- Per-RF proposal: `qa-ai-output/test-design-proposal.md`
- Feature files: `gherkin.featurePath/<type>/` (e.g. `features/functional/`), not the bare feature root

Run `node .qa-ai/scripts/validate-test-design.mjs` after updating proposals and `node .qa-ai/scripts/validate-features.mjs` after generating or changing `.feature` files.
