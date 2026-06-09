# Playwright UI + API Reference

This standard-track reference uses Playwright Test for both browser and API automation against a local application.
It is representative, not mandatory: QA FlowKit continues to support other configured frameworks.

## Validate and execute

From the QA FlowKit source repository:

```bash
npm run test:e2e-playwright -- --runtime
```

The runner packs QA FlowKit, installs it into a temporary copy, completes and resumes a `standard` harness run,
performs strict target validation, installs the example dependencies and executes the API and Chromium projects.

Structural validation without downloading Playwright or a browser:

```bash
npm run test:e2e-playwright
```

## RF-to-PR walkthrough

1. `requirements/RF-301-orders.md` defines the source requirement and acceptance criteria.
2. `qa-ai-output/requirement-analysis.md` and `normalized-requirements.md` record reviewed interpretation.
3. `test-design-system.md` and `test-design-proposal.md` establish the reusable strategy and RF-specific cases.
4. `features/` holds one QA design scenario per test case with RF and TC tags.
5. `automation-feasibility-report.md` and `automation-implementation-plan.md` approve Playwright for both surfaces.
6. `tests/playwright/api/` and `tests/playwright/ui/` implement the approved cases.
7. `traceability-matrix.md`, `testrail-sync-plan.md`, `jira-automation-task.md` and `pr-summary.md` close the audit
   trail without external writes.

## Layout

- `app/server.mjs`: deterministic local UI and API.
- `tests/playwright/ui/`: browser tests.
- `tests/playwright/api/`: request-context tests.
- `playwright.config.mjs`: shared projects and local web server.
- `features/` and `qa-ai-output/`: reviewed QA design and traceability.

No external application, credentials or test-management write is required.
