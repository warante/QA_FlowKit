# Automation Analysis Workflow

Classify approved test cases by automation feasibility and propose implementation.

## Classification

- `automatable`: valuable and technically possible now.
- `manual`: should remain manual for business or operational reasons.
- `partial`: useful coverage can be automated, but manual checks remain.
- `blocked`: automatable in principle, but blocked by data, environment, selectors or framework support.
- `not-automatable`: unsuitable for UI/API automation.

## Output

Update `.qa-ai/output/automation-feasibility-report.md` with:

- Feature/test IDs.
- Recommended framework from `.qa-ai/qa-ai.config.yaml`.
- Required test data, selectors, mocks, clients or schemas.
- Risks and blockers.
- Pending configured issue tracker task drafts when automation cannot be implemented now.

Do not write automation code until `.qa-ai/output/automation-implementation-plan.md` is approved.
