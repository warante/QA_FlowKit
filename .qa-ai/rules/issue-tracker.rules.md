# Issue Tracker Rules

**Enforced by:** prompt-only (MVP: local drafts only)

Apply when drafting Jira, Azure DevOps, GitHub Issues or other work items configured in `tools.issueTracker`.

## Scope (MVP)

- Produce **local markdown drafts** only; do not call external APIs or claim issues were created in the tracker.
- Never store tracker credentials, API tokens or personal access tokens in the repository.

## Primary artifacts

- Consolidated automation task draft: `qa-ai-output/jira-automation-task.md` (required for `doctor --strict` on initialized repos when issue tracking is in scope).
- Optional per-task detail: `qa-ai-output/issue-drafts/<task-id>.md` for multiple blockers.

## Content

- Link tasks to RF IDs, test case IDs (`@id:`), `.feature` paths and automation feasibility outcomes.
- Include clear acceptance criteria, dependencies and suggested priority.
- Mark items blocked on environment, data or tool access explicitly.

## Writes

- Do not create or transition external issues without explicit user approval.
- Do not delete external issues by default.
