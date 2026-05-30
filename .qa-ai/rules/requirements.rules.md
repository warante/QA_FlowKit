# Requirements and Traceability Rules

**Enforced by:** validate-traceability.mjs

Apply during requirement intake, normalization, test design, coverage analysis and traceability updates.

## Requirement identifiers

- Do not generate final Gherkin `.feature` files until the **official RF ID** is confirmed with the user.
- Preserve source RF and CA numbering when normalizing requirements; every acceptance criterion must link back to its RF.
- Use consistent ID shapes in artifacts (for example `RF-123`, `CA-123-1`) matching project conventions.

## Normalized requirements

- Store normalized output under `qa-ai-output/` (default `qa-ai-output/normalized-requirements.md`).
- Separate functional requirements from non-functional items when the source material mixes them.
- Flag ambiguous or missing acceptance criteria before test design.

## Traceability matrix

- Maintain `qa-ai-output/traceability-matrix.md` (or the path from `qa-ai.config.yaml`) as the repo source of truth linking requirements to tests.
- Use a Markdown table with columns at least covering: requirement source, RF, feature file, test management case ID, type, priority, automation status.
- Include at least one RF or test identifier per row.
- Do not duplicate the same test case ID or the same feature file on multiple matrix rows.
- Update the matrix when adding, renaming or removing `.feature` files or automation tests.

## Validation

After changing features or the matrix, run:

```bash
node .qa-ai/scripts/validate-traceability.mjs
```

Use `--allow-empty` or `--allow-missing` only when the repository legitimately has no features or matrix yet.
