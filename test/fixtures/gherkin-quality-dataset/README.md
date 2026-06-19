# Gherkin Quality Dataset

Calibration fixtures for `.qa-ai/rules/gherkin-quality.rubric.md`.

- `good/`: structurally valid examples that should pass `validate-features.mjs`.
- `bad/`: intentionally weak or invalid examples. Each `.feature` has a sidecar
  `<name>.expected.json` with rubric dimensions and, when applicable, structural validator findings.
- `data/`: small local datasets referenced by AI/statistical examples.

The good set includes English and Spanish AI-component statistical examples using the documented `P% of N runs`
grammar and repository-relative adversarial dataset paths.

These fixtures are test data only and are excluded from the npm package.
