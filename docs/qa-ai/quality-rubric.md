# Gherkin Quality Rubric

QA FlowKit separates judgment from enforcement:

- The agent judges semantic quality by reading `.qa-ai/rules/gherkin-quality.rubric.md`.
- Deterministic scripts, added in the next phase, validate that the report is complete, current and threshold-compliant.

This keeps the workflow reviewable. The agent may reason about quality, but the repository stores the rubric and report
format as auditable artifacts.

## Dimensions

The shipped rubric is `rubricVersion: 1` and uses seven binary dimensions:

| Dimension                    | Purpose                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `requirement-fidelity`       | Confirms scenarios test the RF acceptance criteria rather than adjacent behavior. |
| `observability`              | Requires externally observable outcomes in `Then` steps.                          |
| `atomicity`                  | Keeps each scenario focused on one behavior.                                      |
| `determinism`                | Avoids uncontrolled time, order or environment dependence.                        |
| `data-independence`          | Avoids hardcoded environment-specific data and secrets.                           |
| `ui-overspecification`       | Avoids incidental UI details unless required by the RF.                           |
| `language-clarity`           | Keeps business-readable language aligned with `gherkin.language`.                 |
| `source-criterion-alignment` | Matches scenario conditions and outcomes to normalized criterion or CA evidence.  |

Each criterion is evaluated as `pass` or `fail`; there are no numeric scores.

## Configuration

Quality evaluation is off by default:

```yaml
testDesign:
  quality:
    mode: off # off | advisory | gate
    reportPath: .qa-ai/output/gherkin-quality-report.md
    minDimensionsPassed: 7
```

`advisory` mode lets teams collect feedback without blocking. `gate` mode is intended for teams that want the
deterministic validator to block when the report does not meet the configured threshold.

## Versioning Your Rubric

Teams can fork the rubric, but should keep it versioned:

- Increment `rubricVersion` when changing dimensions or criteria.
- Keep criteria binary so reports remain deterministic to validate.
- Document team-specific examples in a separate note instead of changing the report table shape.

The report template lives at `.qa-ai/templates/gherkin-quality-report.template.md`.

## Calibration Dataset

The public calibration corpus lives at
[`test/fixtures/gherkin-quality-dataset/`](../../test/fixtures/gherkin-quality-dataset/). It contains good and bad
English/Spanish Gherkin examples plus machine-readable sidecars for the bad examples. Use it to align reviewers on
what each rubric dimension means before enabling `advisory` or `gate` mode.

## Validator

Run:

```bash
node .qa-ai/scripts/validate-quality-report.mjs
```

The validator checks that the report:

- uses the same `rubricVersion` as the shipped rubric;
- lists every evaluated `.feature` file with the current SHA-256 content hash;
- includes every rubric dimension for every evaluated feature file;
- uses only `pass` or `fail` verdicts and non-empty quoted evidence;
- keeps the summary table consistent with the detail tables.

When `testDesign.quality.mode` is `advisory`, files below `minDimensionsPassed` produce warnings. When the mode is
`gate`, those same misses fail the command and block the optional `gherkin-quality` harness phase.
