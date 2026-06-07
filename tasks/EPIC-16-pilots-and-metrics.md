# Epic 16 - Pilot Program and Outcome Metrics

**Status:** Deferred
**Milestone:** M3
**Accountable:** Product manager
**Contributors:** UX researcher, data analyst, developer relations, QA lead, technical writer, security engineer

## Objective

Validate product value and workflow cost across representative teams using a consistent, privacy-preserving protocol.

## TASK-063 - Define the pilot protocol and metrics

**Owner:** Data analyst
**Depends on:** Epic 14

**Status:** Deferred

Subtasks:

- Define baseline and FlowKit-assisted measurement windows.
- Measure requirement-to-design time, time-to-valid-Gherkin, review cycles, acceptance-criteria coverage, rework and retained artifacts.
- Define qualitative measures for trust, ceremony, clarity and adoption intent.
- Define anonymization, data retention and consent rules.
- Create templates for pilot intake, observation, results and exit interview.

Validation:

- Product, QA, security and data owners approve metric definitions.
- Dry-run the protocol against the existing pilot notes.

Documentation:

- Add `docs/qa-ai/pilot-methodology.md` and reusable templates.

Acceptance:

- Another facilitator can run the pilot without inventing measurements.

Implementation evidence:

- Protocol and metric definitions: `docs/qa-ai/pilot-methodology.md`.
- Intake, observation, result and exit templates: `docs/qa-ai/pilot-templates/`.
- Privacy-safe machine-readable records: `docs/qa-ai/pilot-records/`.
- Analyzer and validation tests: `.github/scripts/analyze-pilot-results.mjs`,
  `.github/scripts/lib/pilot-metrics.mjs` and `.github/scripts/test-pilot-metrics.mjs`.
- Commands: `npm run pilots:analyze` and `npm run test:pilot-metrics`.
- Remaining validation: product, QA, security and data-owner approval before real pilot recruitment.

Deferral note:

- Protocol approval and pilot execution are intentionally postponed.
- The methodology, templates, analyzer and retrospective dry-run remain available and validated.
- No pilot outcome or productivity claim may be inferred while this epic is deferred.

## TASK-064 - Run a manual QA quick-track pilot

**Owner:** UX researcher
**Depends on:** TASK-063 and Epic 15 manual reference

**Status:** Deferred

Subtasks:

- Recruit a team or repository centered on manual test design.
- Capture baseline and assisted workflow data.
- Observe whether quick track removes unnecessary ceremony.
- Record validator defects, documentation gaps and retained outputs.
- Triage findings within five working days.

Validation:

- Reproduce reported product defects in a public fixture where possible.
- Resolve P0/P1 findings or explicitly block the 1.0 milestone.

Documentation:

- Publish anonymized findings and resulting decisions.

Acceptance:

- The pilot completes the common measurement protocol.
- Quick-track ceremony and retained value are documented.
- No unresolved P0/P1 finding remains.

## TASK-065 - Run an alternate-stack standard pilot

**Owner:** QA lead
**Depends on:** TASK-063 and Epic 15

**Status:** Deferred

Subtasks:

- Prefer Selenium/Jest/BrowserStack, Playwright UI or another stack distinct from the first pilot.
- Validate framework discovery, specialist guidance, implementation planning and CI fit.
- Measure manual intervention required to adapt generated output.
- Separate FlowKit defects from agent/model limitations.

Validation and documentation:

- Same evidence and triage requirements as TASK-064.

Documentation:

- Publish anonymized alternate-stack findings and resulting compatibility decisions.

Acceptance:

- The pilot completes the common measurement protocol on a stack distinct from the original pilot.
- Framework-specific manual adaptation and failures are quantified.
- No unresolved P0/P1 finding remains.

## TASK-066 - Run an enterprise/governance pilot

**Owner:** Product manager
**Depends on:** TASK-063, TASK-064

**Status:** Deferred

Subtasks:

- Recruit a team needing formal traceability or release decisions.
- Exercise approvals, audit trail, release gate and strict validation.
- Measure ceremony cost and whether artifacts are used in actual review.
- Test recovery after blocked approvals and failed validation.

Validation:

- Exercise E2E-04 with equivalent public data.
- Resolve all release-gate correctness defects before contract freeze.

Documentation:

- Publish anonymized governance findings and limitations.

Acceptance:

- The pilot completes the common measurement protocol.
- Approval, audit, release-gate and recovery behavior are evidenced.
- No unresolved P0/P1 finding remains.

## TASK-067 - Analyze outcomes and set 1.0 product decisions

**Owner:** Data analyst
**Depends on:** TASK-064 through TASK-066

**Status:** Deferred

Subtasks:

- Compare pilots using the common metric definitions.
- Identify statistically unsupported claims and remove them from marketing copy.
- Recommend default track, onboarding changes and contract changes.
- Classify requests as 1.0 blocker, post-1.0 candidate or out of scope.
- Record explicit decisions on external integrations.

Documentation:

- Publish a consolidated pilot report with limitations.
- Update roadmap, README claims, defaults documentation and Epic 17 inputs.

Acceptance:

- Evidence covers at least three distinct contexts.
- Product manager and engineering lead sign off the 1.0 scope based on findings.

## Epic exit criteria

- M3 gate passes.
- Pilot findings are anonymized, comparable and linked from the task index.
- Any contract-changing pilot finding is resolved before Epic 17 closes.
