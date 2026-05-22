# Implementation Workflow

Implement only approved automation changes using repository conventions.

## Before coding

- Read `qa-ai.config.yaml` to identify UI/API frameworks and paths.
- Inspect existing tests, helpers, fixtures and page objects before creating new patterns.
- Confirm the approved automation implementation plan.
- Ask approval before modifying existing tests or global framework config.

## During coding

- Use the configured UI/E2E framework for UI coverage.
- Use the configured API/integration framework for API coverage.
- Reuse existing selectors, clients, fixtures and schemas when possible.
- Keep tests deterministic and isolated.
- Do not add dependencies without approval.

## After coding

- Run the most relevant local tests when possible.
- If tests cannot be executed, document first manual execution requirements.
- Update `docs/qa/traceability-matrix.md` and `docs/qa/pr-summary.md`.
