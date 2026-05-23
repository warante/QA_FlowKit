# Jira Specialist

> Integration guidance for Jira as requirement source and issue tracker.

## Activation

Use when `tools.issueTracker` or `sources.main` is `jira`.

## Role

Complements the Requirements Intake Agent (when Jira is the requirement source) and the Issue Task Agent (when Jira is the issue tracker) by providing Jira-specific extraction patterns, field conventions and constraints.

## Focus

- Treat Jira content as a requirement source when configured.
- Extract story, RF, acceptance criteria, attachments and linked context.
- Prepare issue/task drafts locally when automation work cannot be completed now.
- Keep external writes disabled in the MVP.
- Never store Jira credentials or private tokens in repository files.

## Requirement Extraction from Jira

When Jira is `sources.main`:

| Jira Field | Maps To | Notes |
|---|---|---|
| Issue Key (PROJ-123) | RF ID | Use as-is or map to RF-[key] |
| Summary | Requirement Title | — |
| Description | Requirement Description | Parse for user story format |
| Acceptance Criteria (custom field or description section) | CA list | Extract numbered criteria |
| Priority | Requirement Priority | Map: Highest/High→high, Medium→medium, Low/Lowest→low |
| Attachments | Supporting docs | Reference file names |
| Linked Issues | Dependencies/Context | Note blocking/blocked relationships |
| Labels/Components | Tags/Categories | Map to test types when applicable |

## User Story Parsing

Detect and extract from common formats:

```
As a [role]
I want to [action]
So that [business value]

Acceptance Criteria:
- Given [context] When [action] Then [expected]
- [criterion in natural language]
```

When the format is non-standard, extract best-effort and flag for review.

## JQL Patterns for Discovery

```
# Find stories for a sprint/epic
project = PROJ AND issuetype = Story AND sprint = "Sprint 23"
project = PROJ AND "Epic Link" = PROJ-100

# Find stories with acceptance criteria
project = PROJ AND issuetype = Story AND description ~ "Acceptance Criteria"

# Find linked test cases
project = PROJ AND issuetype = "Test Case" AND issueFunction in linkedIssuesOf("key = PROJ-123")
```

## Issue Task Draft Format (for Jira)

When creating task drafts for the Issue Task Agent:

```markdown
# Task Draft: [Title]

## Jira Fields
- **Project**: [PROJ]
- **Issue Type**: Task | Story | Sub-task
- **Priority**: [mapped priority]
- **Labels**: automation, qa, [framework]
- **Components**: [if applicable]
- **Epic Link**: [parent epic if known]
- **Linked Issues**: relates to [RF issue key]

## Description
[Task description in Jira markdown format]

## Acceptance Criteria
- [checkbox style criteria]
```

## Custom Fields

- Respect existing custom field configurations.
- Common QA-relevant custom fields: `Acceptance Criteria`, `Test Coverage`, `Automation Status`, `RF ID`.
- When custom fields are unknown, ask user for the field mapping.

## Anti-Patterns to Avoid

- Parsing Jira wiki markup incorrectly — handle `{panel}`, `{code}`, tables and lists.
- Assuming all stories follow the same template — handle variations.
- Creating sub-tasks without knowing the project's workflow — draft only.
- Ignoring linked issues — they provide context for dependencies and scope.
- Storing Jira API tokens or cookies in any file.

## Constraints

- Keep external writes disabled in the MVP. Draft tasks locally only.
- Never store Jira credentials or private tokens in repository files.
- Do not assume project workflow states; ask when needed.
- Do not modify Jira issues without explicit approval and future integration.
