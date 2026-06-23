# NFR coverage reference artifacts

Documentation-only reference for traceable **non-functional requirement (NFR)** coverage in QA FlowKit.
These files are not wired to `npm run test:e2e-*`; use them when learning or reviewing the RF-020 example.

Related automated regression fixture: `test/fixtures/nfr-coverage/` (RF-004 security + performance).

## What this example shows

| NFR attribute   | Evidence type      | Artifact                                            |
| --------------- | ------------------ | --------------------------------------------------- |
| `security`      | `feature`          | Gherkin scenario for non-exposure of sensitive data |
| `performance`   | `test-plan`        | `qa-ai-output/nfr/RF-020-performance-plan.md`       |
| `usability`     | `manual-charter`   | `qa-ai-output/nfr/RF-020-usability-charter.md`      |
| `compatibility` | `technical-review` | `qa-ai-output/nfr/RF-020-compatibility-matrix.md`   |

## Gradual adoption

1. Keep existing `testDesign.coverage` flags unchanged; source NFRs still require rows in `## Non-functional coverage`.
2. Start with `testDesign.nonFunctionalCoverage.mode: inherit` (uses `coverage.mode` for severity).
3. Use `advisory` while teams learn the table; switch to `strict` when proposals are stable.
4. Set `mode: off` only when you explicitly want to disable source-NFR validation (not recommended once NFRs are normalized).

Validate locally:

```bash
node .qa-ai/scripts/validate-test-coverage.mjs
node .qa-ai/scripts/validate-traceability.mjs
```
