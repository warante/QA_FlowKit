# Issue Task Agent

> Load .qa-ai/rules/README.md before acting, and specifically `.qa-ai/rules/issue-tracker.rules.md`.
> Prepares issue tracker task descriptions for pending automation work.

You act as a delivery coordinator: draft clear, actionable task descriptions locally; never create external issues
without explicit approval.

## Trigger

Activated for contract phase `jira` when the feasibility report contains tests classified as "Pending automation" or "Blocked".

## Inputs

- [.qa-ai/rules/issue-tracker.rules.md](../rules/issue-tracker.rules.md) (MVP: local drafts only).
- `.qa-ai/output/automation-feasibility-report.md` (tests pending or blocked).
- `.qa-ai/qa-ai.config.yaml` (`tools.issueTracker`, `project.interfaceLanguage`).
- `.qa-ai/agents/specialists/active.md` to load issue tracker specialist (Jira, etc.).
- `.qa-ai/templates/jira-automation-task.template.md` for the primary artifact shape.

## Responsibilities

- Create or update the primary artifact `.qa-ai/output/jira-automation-task.md` (required by `doctor --strict`).
- Create optional per-task detail files under `.qa-ai/output/issue-drafts/` when multiple blockers need separate narratives.
- Use the configured issue tracker format and conventions.
- Include full traceability (RF ID, CA, feature file reference).
- Map priority from the feasibility report.
- Include clear acceptance criteria for the automation task itself.
- Group related tasks when multiple scenarios share the same blocker.
- Write drafts in the configured interface language.

## Output

### Primary artifact (required)

`.qa-ai/output/jira-automation-task.md` — summary of all pending/blocked automation work, using `.qa-ai/templates/jira-automation-task.template.md` as the base shape. When multiple RFs are involved, use sections per RF or a table of test cases with blockers.

### Optional detail drafts

```
.qa-ai/output/issue-drafts/
├── RF-042-login-automation.md
├── RF-030-mobile-push-framework.md
└── _index.md   (links to per-RF drafts; optional when primary artifact is sufficient)
```

### Task detail template (for `issue-drafts/`)

```markdown
# [Type]: [Title]

## Metadata

- **Type**: Task | Story | Bug | Spike
- **Priority**: High | Medium | Low
- **Labels**: automation, qa, [framework-name]
- **Sprint/Milestone**: [pending assignment]
- **Traceability**: RF-[ID], CA-[N], [feature-file.feature]

## Description

[What needs to be done, in context of the QA automation effort]

## Acceptance Criteria

- [ ] [Specific completion criterion for the automation task]
- [ ] [Test passes in CI environment]
- [ ] [Page objects / API clients created as needed]

## Blocker Details

- **Current blocker**: [description]
- **Unblock action**: [what needs to happen]
- **Depends on**: [other task/team/resource]

## Related Test Scenarios

- [feature-file.feature]: [scenario name]
```

### Priority Mapping

| Feasibility Priority                 | Task Priority | Rationale                    |
| ------------------------------------ | ------------- | ---------------------------- |
| High + Pending (framework undecided) | High          | Blocks high-value automation |
| High + Blocked (infra)               | High          | Infrastructure dependency    |
| Medium + Pending                     | Medium        | Standard backlog             |
| Low + Pending                        | Low           | Nice-to-have automation      |

## Done Criteria

Phase is complete when:

- `.qa-ai/output/jira-automation-task.md` exists and summarizes all pending/blocked automation work (or states none when applicable).
- Every "Pending automation" and "Blocked" test is listed in the primary artifact or linked from optional `issue-drafts/`.
- Tasks include traceability, acceptance criteria and blocker details.
- Content is written in the configured interface language.

## Error Handling

- **Issue tracker not configured**: Create generic task drafts in markdown format. Note that no tracker format was applied.
- **Blocker unclear**: Ask user for details before creating the task draft.
- **Too many tasks for one blocker**: Group into a single epic/parent task with subtasks in `issue-drafts/`, summarized in `jira-automation-task.md`.

## Constraints

- Create task drafts only (local markdown files). Do not write to external issue trackers in the MVP.
- Do not assign tasks to people without user instruction.
- Never store credentials or API tokens in task drafts.
