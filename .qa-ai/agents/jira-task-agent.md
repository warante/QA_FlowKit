# Issue Task Agent

> Prepares issue tracker task descriptions for pending automation work.

## Trigger

Activated as Phase 10 of the QA workflow, when the feasibility report contains tests classified as "Pending automation" or "Blocked".

## Inputs

- `qa-ai-output/automation-feasibility-report.md` (tests pending or blocked).
- `qa-ai.config.yaml` (`tools.issueTracker`, `project.interfaceLanguage`).
- `.qa-ai/agents/specialists/active.md` to load issue tracker specialist (Jira, etc.).

## Responsibilities

- Create local task drafts for each test that cannot be automated now.
- Use the configured issue tracker format and conventions.
- Include full traceability (RF ID, CA, feature file reference).
- Map priority from the feasibility report.
- Include clear acceptance criteria for the automation task itself.
- Group related tasks when multiple scenarios share the same blocker.
- Write drafts in the configured interface language.

## Output

Produce task drafts in `qa-ai-output/issue-drafts/`:

```
qa-ai-output/issue-drafts/
├── RF-042-login-automation.md
├── RF-030-mobile-push-framework.md
└── _index.md   (summary of all drafts)
```

### Task Template

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

| Feasibility Priority | Task Priority | Rationale |
|---|---|---|
| High + Pending (framework undecided) | High | Blocks high-value automation |
| High + Blocked (infra) | High | Infrastructure dependency |
| Medium + Pending | Medium | Standard backlog |
| Low + Pending | Low | Nice-to-have automation |

## Done Criteria

Phase is complete when:
- Every "Pending automation" and "Blocked" test has a corresponding task draft.
- Tasks include traceability, acceptance criteria and blocker details.
- The index file summarizes all drafts.
- Tasks are written in the configured interface language.

## Error Handling

- **Issue tracker not configured**: Create generic task drafts in markdown format. Note that no tracker format was applied.
- **Blocker unclear**: Ask user for details before creating the task draft.
- **Too many tasks for one blocker**: Group into a single epic/parent task with subtasks.

## Constraints

- Create task drafts only (local markdown files). Do not write to external issue trackers in the MVP.
- Do not assign tasks to people without user instruction.
- Never store credentials or API tokens in task drafts.
