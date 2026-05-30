# Automation Rules

**Enforced by:** prompt-only (feasibility artifacts reviewed in workflow)

Apply before implementing or refactoring automated tests.

- Automate every test that is technically possible and valuable under current repo constraints.
- Generate a technical proposal before writing code ([workflow.rules.md](workflow.rules.md) proposal-first).
- Do not modify existing tests without approval ([approval.rules.md](approval.rules.md)).
- If tests cannot be executed, mark first execution as manual.
- Create configured issue tracker task drafts for automatable tests that cannot be implemented now ([issue-tracker.rules.md](issue-tracker.rules.md)).
- UI/E2E specifics: [ui-automation.rules.md](ui-automation.rules.md).
- API specifics: [api-testing.rules.md](api-testing.rules.md).
