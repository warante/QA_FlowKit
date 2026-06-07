# 1.0 Implementation Plan Review

**Review date:** 2026-06-07
**Scope:** `ROADMAP.md`, `tasks/`, and the future-planning pointer in `docs/qa-ai/backlog.md`
**Review perspectives:** Product, engineering architecture, QA, security, developer experience, documentation and release

## Review method

- Checked task numbering, uniqueness and continuity.
- Checked every task for owner, dependency, documentation and acceptance sections.
- Checked epic dependencies and milestone gates for cycles or premature release steps.
- Mapped planned testing to unit, integration, smoke, E2E, CI, CodeQL and package verification.
- Checked Windows, Ubuntu and Node.js support coverage.
- Checked release tasks against release-please and npm publishing constraints.
- Checked security boundaries, external-write scope and pilot privacy requirements.
- Checked relative Markdown links and Prettier formatting.
- Ran the current repository validation suite to ensure planning changes did not break the project.

## Findings and corrections

### Finding 1 - Incomplete task completion contracts

Some pilot tasks had no explicit acceptance section, and several release tasks did not state their documentation
deliverable.

**Correction:** Every task from TASK-051 through TASK-087 now contains owner, dependency, documentation and acceptance
sections.

### Finding 2 - Missing QA leadership accountability

The plan assigned work to a QA lead but the delivery-team matrix only listed QA automation engineering.

**Correction:** Added QA lead accountability for test strategy, severity and release quality sign-off.

### Finding 3 - RC and stable release ordering

The first draft prepared stable release configuration before RC publication, which could conflict with the required
dist-tag and release order.

**Correction:** TASK-079 now separates `beta -> rc` and `rc -> stable`. RC must publish to `rc`; the stable policy
change remains unmerged until the RC soak and approval complete.

### Finding 4 - Missing execution cadence

The roadmap had milestone gates but no implementation cadence or explicit critical path.

**Correction:** Added parallel work windows, the critical path and the rule that contract inventory may begin during
pilots but contract freeze cannot close before pilot decisions.

### Finding 5 - Competing future-planning sources

The historical backlog ended with an unstructured future-epics list.

**Correction:** The backlog now points to `tasks/README.md` as the executable 1.0 plan and retains only post-1.0
candidates.

## Coverage result

| Area                               | Result |
| ---------------------------------- | ------ |
| Strategic milestones and gates     | PASS   |
| Epics, tasks and subtasks          | PASS   |
| Ownership across required profiles | PASS   |
| Dependency order and critical path | PASS   |
| Documentation in every task        | PASS   |
| E2E and CI coverage                | PASS   |
| Security and privacy boundaries    | PASS   |
| Release-please and npm constraints | PASS   |
| Relative links and formatting      | PASS   |

## Residual risks

- Pilot recruitment and feedback timing can extend the schedule.
- Real-host adapter E2E automation may be unavailable for some agents; the plan requires explicit manual evidence and
  support-level labeling instead of claiming unverified compatibility.
- npm/GitHub administrative settings require a human maintainer and cannot be guaranteed by repository code.
- The exact release-please mechanism for selecting `1.0.0-rc.N` must be proven in TASK-079 before any RC release.

## Decision

**PASS**

The plan is complete and logically sequenced for the current product scope. Stable `1.0.0` remains blocked on external
pilot evidence, contract freeze, trust baseline, RC soak and human release approval, as intended.
