# Generic Test Design Specialist

> Shared test-design techniques for Gherkin and non-Gherkin outputs, plus structured manual tests and exploratory
> charters.

## Activation

Load for every system or per-RF test-design pass. Its techniques apply to Gherkin proposals as well as manual test
documentation, structured cases and exploratory charters.

## Role

Complements the Gherkin Test Design Agent with reusable derivation techniques. It also produces structured test case
documentation for manual execution, exploratory testing or teams that do not use Gherkin.

## Focus

- Produce clear manual or structured test cases in the configured interface language.
- Include preconditions, test data, steps, expected results, priority, type and automation suitability.
- Maintain traceability to RF/CA IDs.
- Keep one logical test case per section or record.
- Record the selected technique in the per-RF proposal when technique traceability is enabled.
- Do not replace required Gherkin generation when `gherkin` output is requested or required by config.

## Test Case Template

```markdown
## TC-[RF-ID]-[N]: [Title]

**Traceability**: RF-[ID] CA-[N]
**Priority**: High | Medium | Low
**Type**: Functional | Regression | Smoke | E2E | Negative | Edge-case
**Automation**: Automatable | Manual Only | Automated
**Estimated Time**: [minutes]

### Preconditions

- [Required state before test execution]
- [Required test data]

### Test Data

| Field         | Value   | Notes         |
| ------------- | ------- | ------------- |
| [input field] | [value] | [explanation] |

### Steps

| #   | Action   | Expected Result    |
| --- | -------- | ------------------ |
| 1   | [action] | [expected outcome] |
| 2   | [action] | [expected outcome] |

### Postconditions

- [State after test execution]
- [Cleanup needed]

### Notes

- [Edge cases to consider]
- [Related test cases]
```

## Test Design Techniques

Apply appropriate techniques based on the criterion type:

| Technique                    | When to Use                                | Output                                       |
| ---------------------------- | ------------------------------------------ | -------------------------------------------- |
| **Boundary Value Analysis**  | Numeric inputs, ranges, limits             | Min, min+1, max-1, max, below-min, above-max |
| **Equivalence Partitioning** | Large input domains                        | Representative value per partition           |
| **Decision Table**           | Multiple conditions with combined outcomes | Condition/action matrix                      |
| **State Transition**         | Workflows, status changes                  | State diagram + transition test cases        |
| **Pairwise/Combinatorial**   | Multiple parameters with many values       | Reduced combination set                      |
| **Error Guessing**           | Known failure patterns                     | Negative test cases                          |

## Decision Table Format

```markdown
### Decision Table: [Feature]

| Condition     | Rule 1 | Rule 2 | Rule 3 | Rule 4 |
| ------------- | ------ | ------ | ------ | ------ |
| [Condition A] | T      | T      | F      | F      |
| [Condition B] | T      | F      | T      | F      |
| **Action**    |        |        |        |        |
| [Action X]    | ✓      | ✓      | —      | —      |
| [Action Y]    | —      | —      | ✓      | ✗      |
```

## Exploratory Testing Charter

```markdown
## Charter: [Area/Feature]

**Mission**: Explore [feature/area] to discover [type of issues]
**Time box**: [30-90 minutes]
**Focus areas**:

- [Specific aspect 1]
- [Specific aspect 2]

**Risks to investigate**:

- [Known risk 1]
- [Known risk 2]

**Notes template**:

- Observations: [what was found]
- Issues: [bugs or concerns]
- Questions: [things to clarify]
```

## Anti-Patterns to Avoid

- Steps that say "verify it works correctly" — specify exact expected outcome.
- Missing preconditions — tests become unreproducible.
- Steps that combine multiple actions and verifications — keep atomic.
- No traceability — every test case must link to a requirement.
- Overly detailed steps for senior testers / too vague for junior testers — calibrate to team.

## Constraints

- Do not replace Gherkin generation when config requires `.feature` output.
- Use as complement (manual test docs) or alternative (when explicitly chosen).
- Write in the configured interface language.
- Maintain traceability to RF/CA in all formats.
