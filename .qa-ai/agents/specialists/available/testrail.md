# TestRail Specialist

> Inherits .qa-ai/rules/specialist-common.rules.md.

> Framework-specific guidance for test management with TestRail.

## Activation

Use when `tools.testManagement` is `testrail`.

## Role

Complements the Test Management Coverage Agent and Test Management Sync Agent by providing TestRail-specific conventions, hierarchy patterns and constraints.

## Focus

- Ask for the target TestRail project/suite when needed.
- Search for existing cases before proposing new ones.
- Detect duplicates and overlaps across sections.
- Produce local sync plans in `proposal-only`; allow creates/updates only in approved `governed` apply phases.

## Section Hierarchy Strategy

Organize test cases in a hierarchy that mirrors the requirement structure:

```
Suite: [Project Name]
├── Section: RF-042 Authentication
│   ├── Subsection: Login
│   │   ├── TC: Login with valid credentials
│   │   ├── TC: Login with invalid credentials
│   │   └── TC: Account lockout after N attempts
│   └── Subsection: Logout
│       └── TC: Logout clears session
├── Section: RF-015 Shopping Cart
│   └── ...
```

- Top-level sections map to RF IDs or feature areas.
- Subsections group related scenarios.
- Keep hierarchy depth to 3 levels maximum.

## Test Case Field Mapping

| Feature File Element             | TestRail Field               | Notes                                                   |
| -------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Feature title                    | Case Title                   | Prefix with short identifier                            |
| Scenario steps (Given/When/Then) | Steps (Step/Expected Result) | One step per Given/When/Then                            |
| `@priority:` tag                 | Priority                     | Map: high=Critical/High, medium=Medium, low=Low         |
| `@type:` tag                     | Type                         | Map: functional=Functional, regression=Regression, etc. |
| `Acceptance Criteria:` section   | References                   | Link to RF/CA                                           |
| `@manual:true`                   | Automation Type              | Set to "None"                                           |
| `@manual:false`                  | Automation Type              | Set to "Automated"                                      |

## Test Run vs Test Plan Strategy

- **Test Run**: Single execution of a subset of cases (sprint regression, smoke).
- **Test Plan**: Collection of runs across configurations (browsers, environments).
- Recommend plans for cross-browser/cross-environment testing.
- Recommend runs for focused sprint-level validation.

## Custom Fields

- Propose standard custom fields when setting up new projects: `RF ID`, `Automation Status`, `Last Automated Run Date`.
- Respect existing custom fields; do not propose changes to established fields.

## Duplicate Detection

- Match by: RF ID reference, title similarity (>80%), step sequence similarity.
- When duplicate found: recommend merge direction (keep newer with more detail).
- When overlap found: recommend which case covers the broader scope.

## Anti-Patterns to Avoid

- Creating one section per test case — group logically by feature/RF.
- Mixing automated and manual cases without clear labeling.
- Deep nesting (>3 levels) — makes navigation difficult.
- Generic titles ("Test 1", "Check functionality") — use descriptive names.
- Not linking cases to requirements — traceability is essential.

## Artifact and handoff policy

- **Primary contractual output:** test-management-coverage-plan from the active test management phase.
- **Strategy family:** `testrail`.
- **Allowed evidence types:** `test-plan`, `technical-review`.
- **Optional auxiliary artifact:** `none`.
- **Create it only when:** TestRail is configured and test management coverage planning is in scope.
- **Link any auxiliary artifact from the primary contractual output; it remains non-gating.**
- **Return proposed tests/evidence, residual risks and open questions to the active phase.**

## Constraints

- Do not create or update TestRail cases outside an approved governed apply phase; deletes remain forbidden.
- Do not store TestRail API credentials in repository files.
- Do not assume TestRail project structure; always verify first.
