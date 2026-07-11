# Requirements and Traceability Rules

**Enforced by:** validate-traceability.mjs, validate-test-coverage.mjs (source NFR rows)

Apply during requirement intake, normalization, test design, coverage analysis and traceability updates.

## Requirement identifiers

- Without an official RF ID, generate only draft Gherkin carrying `RF-PENDING*` and `@wip`. Draft features are excluded
  from automation, external synchronization and PASS release decisions. Assign the official ID with
  `qa-flowkit assign-rf` before those phases.
- Preserve source RF and CA numbering when normalizing requirements; every acceptance criterion must link back to its RF.
- Use consistent ID shapes in artifacts (for example `RF-123`, `CA-123-1`) matching project conventions.

## Normalized requirements

- Store normalized output under `.qa-ai/output/` (default `.qa-ai/output/normalized-requirements.md`).
- When semantic coverage is enabled, use atomic criterion rows with stable `Criterion ID`, `Condition or partition`,
  `Expected observable outcome` and `Status` (`ready`, `ambiguous`, `out-of-scope`, `pending-decision`).
- Separate functional criteria from explicit source NFRs in `## Non-functional requirements` with stable `NFR ID`
  values. Use `None identified` only when the source has no explicit NFR statements.
- Flag ambiguous or missing acceptance criteria before test design.
- Follow `requirements.inferredAcceptanceCriteria`:
  - `forbid`: do not propose inferred acceptance criteria; ask for source clarification instead.
  - `require-approval`: keep inferred acceptance criteria separated and pending approval before use.
  - `allow`: inferred acceptance criteria may be included when clearly labeled as inferred and traceable to evidence.

## Traceability matrix

- Maintain `.qa-ai/output/traceability-matrix.md` (or the path from `.qa-ai/qa-ai.config.yaml`) as the repo source of truth linking requirements to tests.
- Use a Markdown table with columns at least covering: requirement source, RF, feature file, test management case ID, type, priority, automation status.
- When `normalized-requirements.md` lists source NFRs, add `## Non-functional traceability` with one row per `NFR ID`.
  Do not count NFR rows as functional CA coverage in summary metrics.
- Include `Criterion IDs` on functional matrix rows when the proposal uses atomic criteria.
- Use `Automation Status: proposal-only` for planned tests without generated artifacts.
- Include at least one RF or test identifier per functional row.
- Do not duplicate the same test case ID or the same feature file on multiple matrix rows.
- Update the matrix when adding, renaming or removing `.feature` files or automation tests.

## Validation

After changing features or the matrix, run:

```bash
node .qa-ai/scripts/validate-traceability.mjs
node .qa-ai/scripts/validate-test-coverage.mjs
```

Use `--allow-empty` or `--allow-missing` only when the repository legitimately has no features or matrix yet.
