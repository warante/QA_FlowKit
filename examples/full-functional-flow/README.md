# Full Functional Flow Demo

Complete end-to-end QA workflow demonstration for **RF-501 "User Registration"** using the `standard` track with advisory mode and all feature flags enabled.

## Coverage

This example walks through the full QA lifecycle:

1. **Requirement** — Source requirement with 6 acceptance criteria
2. **Risk Analysis** — Weighted scoring, risk assessment, risk register
3. **Test Design** — System design and test design proposal
4. **Test Data** — Synthetic data plan with inventory
5. **Environment Readiness** — Local target readiness checks
6. **Gherkin** — Feature file with tags, traceability, and acceptance criteria
7. **Traceability Matrix** — Full RF → Criterion → Test mapping
8. **Execution Plan** — Command-based execution plan with timeouts
9. **Result Analysis** — Pass/fail classification and analysis
10. **Defect Triage** — Action plan for identified issues
11. **PR Summary** — Pull-request-ready QA summary
12. **Release Gate** — Go/no-go decision with evidence paths
13. **Learning Loop** — Lessons captured and improvement proposals

## Reference

- **Requirement**: RF-501 — User Registration (6 CAs)
- **Track**: `standard`
- **Mode**: advisory (all recommendations, no automatic writes)

## Validation

```bash
npm run test:e2e-full-functional-flow
```
