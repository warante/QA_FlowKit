# Test Strategy Incorporation Plan

**Planning baseline:** 2026-11-22 (Europe/Madrid).
**Status:** Local technical implementation in validation; not yet merged or independently accepted.
**Accountable:** Engineering lead; scope approval by maintainer and QA lead.

## Scope and placement in the existing plan

This plan adapts selected ideas from _Fifty Quick Ideas to Improve Your User Stories_ (Gojko Adzic and
David Evans) and _Fifty Quick Ideas to Improve Your Tests_ (Gojko Adzic, David Evans and Tom Roden).
It contains original implementation proposals, not book extracts. Local reference books are not deliverables,
fixtures, package assets or runtime dependencies.

Use the existing [roadmap](../ROADMAP.md) and [delivery plan](README.md):

- EPIC-P3 owns semantic test-design improvements and their evaluation.
- EPIC-P5 owns maintenance analytics using existing local metrics and result analysis.
- Epic 16 TASK-063/TASK-067 provide the future pilot methodology and outcome-analysis linkage.
- Epic 17 contract and migration safeguards apply to any later schema or validator changes.
- Epics 19-20 retain their current release gates. These additions are not new blockers for the current RC.

Do not create a parallel workflow, new specialist per technique, new mandatory artifact, or new Gherkin type.
Use the canonical workflow contract for phase inclusion/order; phase labels below describe integration surfaces,
not a replacement sequence. Keep quick-track overhead small and preserve existing projects by default.

## Existing foundations versus new work

Existing foundations include atomic Criterion IDs and pending decisions, equivalence partitioning, boundaries,
decision tables, manual charters, feasibility classifications, failure analysis and RF/CA traceability.
Their existence is not evidence that the enhancements below are implemented.

New work is explicit ambiguity probing, outcome-first derivation, redesign before automation, benefit evaluation,
cross-capability coverage, capability navigation and maintenance-change analysis.

## Delivery slices and dependencies

| Slice                                     | Existing epic     | Tasks                                 | Integration surfaces                              | Exit evidence                                                             |
| ----------------------------------------- | ----------------- | ------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| A - Better decisions and checks           | EPIC-P3           | TASK-P3-001, TASK-P3-002, TASK-P3-003 | Normalization, per-RF design, feasibility         | Approved guidance; bilingual good/bad fixtures; unchanged legacy behavior |
| B - System context and reusable knowledge | EPIC-P3           | TASK-P3-004, TASK-P3-005, TASK-P3-006 | System design, per-RF design, impact analysis     | Optional sections and derived navigation with stable RF/CA/TC links       |
| C - Evaluation and maintenance            | EPIC-P3 / EPIC-P5 | TASK-P3-007, TASK-P5-001              | Result analysis, learning; Epic 16 pilot protocol | Reproducible comparative report and privacy-safe local metrics            |

Dependencies: 001 -> 002 -> 003; 001 -> 004 -> 005 -> 006; 001-006 -> 007; 006 -> P5-001.
Independent tasks may overlap only after their declared inputs are approved.
Implementation scheduling now follows [FINAL-ACCEPTANCE.md](FINAL-ACCEPTANCE.md): technical slices may proceed
after their input contracts and regressions are checked, while independent acceptance and pilots follow the batch.
Completion still requires actual acceptance evidence; this scheduling change does not waive release prerequisites.

## TASK-P3-001 - Surface ambiguous behavior with contrast cases

**Status:** In validation
**Owner:** QA lead
**Depends on:** Existing normalized requirements and pending-decision contract.
**Estimate:** 1-2 engineering days, excluding review waits.

- Extend normalization guidance with a small set of open-ended boundary questions, examples and counter-examples.
- Use always/never statements as prompts for exceptions, not as facts to invent.
- Link each question to the affected Criterion ID and record the decision owner.
- Unresolved outcomes stay pending-decision and cannot become approved expected results.

**Acceptance and tests:** English/Spanish fixtures cover conflicting rules, exact boundaries, missing answers and
resolved answers. Feature generation remains blocked for unresolved criteria; no extra mandatory phase is introduced.
**Documentation:** requirements guidance, requirements rules and a worked bilingual normalization example.

## TASK-P3-002 - Derive tests from observable outcomes

**Status:** In validation
**Owner:** QA automation engineer
**Depends on:** TASK-P3-001.
**Estimate:** 2-3 engineering days.

- Specify the expected result, observation source and decision oracle before minimal actions and preconditions.
- Check output partitions as well as input partitions; justify representative examples and counter-examples.
- For prohibited effects, record the alternative behavior plus evidence of non-occurrence where relevant.
- For asynchronous systems, define bounded observation, correlation and terminal state; an error message alone
  does not prove that a background side effect never occurred.

**Acceptance and tests:** Fixtures distinguish observable outcomes from vague assertions, cover an untested output
partition, and reject unsupported certainty about asynchronous absence. Semantic judgments start advisory;
deterministic validation must not pretend to prove business correctness.
**Documentation:** generic-test-design guidance, design rules and good/bad examples.

## TASK-P3-003 - Require redesign analysis before manual-test automation

**Status:** In validation
**Owner:** QA automation engineer
**Depends on:** TASK-P3-002.
**Estimate:** 1-2 engineering days.

- Extend existing feasibility proposals with redesign needs, isolation, data setup, deterministic oracle and
  appropriate execution layer.
- Separate business checks, technical checks and exploratory observations; preserve their shared purpose.
- Recommend event/state-based waits, controlled clocks where supported, and reproducible independent data.
- Keep human judgment manual; do not automatically translate long UI scripts or modify existing tests.

**Acceptance and tests:** A manual journey produces smaller proposed automated checks and retained human
exploration, with RF/CA links. Unsupported framework features remain blockers. Approved statuses and
existing modification gates remain unchanged.
**Documentation:** feasibility guidance, automation rules and one manual-to-automation redesign example.

## TASK-P3-004 - Separate implementation checks from benefit evaluation

**Status:** In validation
**Owner:** Product manager
**Depends on:** TASK-P3-001; reuse TASK-063 methodology without resuming deferred pilots.
**Estimate:** 1-2 engineering days.

- Record specific user segment, intended behavior change, baseline, proposed target and observation method.
- Distinguish team-controlled outputs from influenced outcomes and external dependencies.
- Unknown metrics stay unknown; proposed targets require approval. Do not turn business benefit into a
  deterministic acceptance assertion when evidence cannot establish it.
- Offer optional QUPER-style utility/differentiation/saturation discussion for continuous quality requirements;
  approved executable thresholds still need precise metrics, conditions and observation windows.

**Acceptance and tests:** Worked examples separate successful implementation from unproven user benefit;
missing baselines and unapproved targets are not reported as measured improvements.
**Documentation:** system-design guidance and references to existing pilot methodology/templates.

## TASK-P3-005 - Add optional cross-capability risk coverage

**Status:** In validation
**Owner:** QA lead
**Depends on:** TASK-P3-004.
**Estimate:** 2-3 engineering days.

- Add an optional attribute-component-capability (ACC) view inside system design, referencing existing risks,
  NFRs and evidence instead of copying them into competing sources of truth.
- Improve exploratory charters around user capabilities spanning features; retain bounded missions and stop conditions.
- Reference global risk checklists and trust assumptions; do not assume an external component is safe without evidence.

**Acceptance and tests:** A multi-feature example exposes a cross-cutting gap and links a manual-charter or
other supported evidence type. Quick track does not acquire a mandatory matrix. No new artifact/type is required.
**Documentation:** system-design and exploratory guidance plus a small ACC example.

## TASK-P3-006 - Provide capability navigation without replacing traceability

**Status:** In validation
**Owner:** CLI/framework engineer
**Depends on:** TASK-P3-005.
**Estimate:** 2-4 engineering days.

- Propose a derived capability/behavior index for finding current tests before creating new ones.
- Keep canonical RF/CA/TC IDs, existing type folders, history and test-management mappings intact.
- Support create/reuse/update proposals; ambiguous matches require review and never authorize auto-deduplication.
- Determine whether current metadata suffices before proposing additive schema fields or commands.

**Acceptance and tests:** Two RFs affecting one capability can discover an existing TC without copying or
renaming it; conflicting behavior versions remain distinguishable. Derived views are rebuildable and
do not delete audit history. Any contract change includes schema, migration and npm-pack regressions.
**Documentation:** traceability/impact guidance and navigation/compatibility examples.

## TASK-P3-007 - Evaluate usefulness before promotion

**Status:** In validation
**Owner:** QA lead
**Depends on:** TASK-P3-001 through TASK-P3-006; TASK-063/TASK-067 approval before real pilots.
**Estimate:** 2-4 engineering days for fixture evaluation; external pilot time not estimated.

- Compare baseline and revised outputs on a fixed, privacy-safe requirement set.
- Have reviewers assess unresolved ambiguity, incorrect oracles, duplicate scenarios, review rework and retained value.
- Separate deterministic fixture checks, human quality assessment and actual end-user outcomes.
- Preserve counterproductive examples as regressions; record retain/revise/defer decisions per enhancement.

Technical follow-up: `review-test-strategy.mjs` prepares hash-bound comparison packets and validates supplied,
pseudonymous review records across ambiguity, oracle correctness, duplication, review rework and retained value.
It reports stale inputs, self-review, uncertainty and disagreement without inventing reviewer judgments or granting
acceptance. Human comparative review remains pending; this tooling does not complete TASK-P3-007 by itself.

**Acceptance and tests:** Publish method, sample, limitations and review evidence. Fixture improvements are
not productivity claims; no resumed pilot, real-user endorsement or multi-agent consensus is fabricated.
**Documentation:** evaluation report, updated strategy status and links to pilot methodology.

## TASK-P5-001 - Analyze test maintenance alongside execution health

**Status:** In validation
**Owner:** CLI/framework engineer
**Depends on:** TASK-P3-006 and existing test-intelligence/result-analysis contracts.
**Estimate:** 2-3 engineering days.

- Use local Git history and supplied execution records to summarize change frequency by test/capability.
- Distinguish product evolution, fragile test code, environment and data changes.
- Report missing history, shallow clones and absent run data as limitations, not zero maintenance.
- Combine change history with flakiness and duration as investigation signals; do not claim statistical
  half-life from insufficient observations.

**Acceptance and tests:** Synthetic Git/run histories exercise renamed tests, legitimate behavior changes,
insufficient evidence and flaky results. No automatic deletion, quarantine, remote telemetry or ranking of people.
**Documentation:** test-intelligence guidance, local metrics definitions and privacy/interpretation limits.

## Validation, safety and rollout

Every task includes implementation, focused tests, user documentation and independent review before Done.
Changes to agents require the guidance manifest and generated adapters/plugin to remain consistent.
Use existing off/advisory/strict conventions only where a real deterministic check exists; approve any
new public option separately, default it compatibly and add migration fixtures before strict enforcement.
Do not promise that phrase matching proves semantic correctness.

Minimum validation: lint, formatting, docs consistency, focused validator/guidance tests, full
`validate:oss-extraction`, npm-pack verification and supported-platform CI on the candidate commit.
Preserve release gates, current coverage thresholds, official RF requirements and approval boundaries.

## Effort and progress accounting

- New enhancement implementation: **0/8 tasks Done** at this planning baseline.
- Local technical delivery is now prepared for all eight tasks; TASK-P3-007 has evaluation tooling, not completed
  independent semantic evaluation. All eight remain In validation pending final acceptance and remote CI.
- Existing foundations are reused but do not count as completed enhancement tasks.
- Engineering estimate: **13-23 person-days**, based on the task ranges above; low confidence until
  slice A is reviewed. This is effort, not elapsed time or a release commitment.
- Deliver as three reviewable slices, normally across roughly 3-4 short iterations if capacity permits.
  Human review, schema decisions and pilot recruitment may extend elapsed time.
- Stable-release closure remains separate; no estimate here includes soak, approvals or publication.

Update task statuses and link actual commits, tests and review evidence when work lands.
See [implementation status](IMPLEMENTATION-STATUS.md) for the historical stabilization track.

## Implementation record

Local delivery, 2026-11-22; no merge, pilot or external acceptance is implied:

| Task        | Local implementation                                                             | Regression / acceptance evidence                                                              |
| ----------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| TASK-P3-001 | Contrast questions and pending-decision handling in normalization guidance/rules | Bilingual synthetic decisions; open-question/ready conflict regression                        |
| TASK-P3-002 | Outcome-first design guidance and optional proposal table                        | Structural oracle/output/async checks; deliberately false populated oracle remains unverified |
| TASK-P3-003 | Automation redesign guidance and worked manual-to-automation example             | Missing isolation/synchronization diagnostics; framework/approval boundaries retained         |
| TASK-P3-004 | Optional benefit table, control boundaries and QUPER guidance                    | Unapproved/unknown baseline and false measured-claim regressions                              |
| TASK-P3-005 | Optional ACC view and capability-based exploratory guidance                      | Cross-capability example and incomplete-link structural checks                                |
| TASK-P3-006 | Derived read-only Feature-title index in standalone analyzer                     | Multi-RF, Rule inheritance, Spanish, outlines, duplicate IDs and conflicting versions         |
| TASK-P3-007 | Fixed bilingual structural dataset and comparative evaluation script             | Synthetic baseline/candidate report; independent semantic review deferred                     |
| TASK-P5-001 | Bounded local Git rename-aware counts and supplied execution summaries           | Synthetic Git history, shallow/missing history, mixed revisions, timings and malformed inputs |

Entry point: `node .qa-ai/scripts/analyze-test-strategy.mjs --json`.
Development checks: `npm run test:strategy-analysis`, `npm run test:strategy-evaluation`, existing full suite
and packed-install smoke. The [user guide](../docs/qa-ai/test-strategy.md) describes interpretation and limitations.
Final acceptance, real pilots and task closure remain in [FINAL-ACCEPTANCE.md](FINAL-ACCEPTANCE.md).

Local implementation verification:

- `npm run validate:oss-extraction`: passed, 90 steps including packed-install and update smoke checks.
- `npm run test:strategy-analysis`: passed, 15 tests.
- `npm run test:strategy-evaluation`: four bilingual structural comparisons passed; semantic review not performed.
- `npm run test:agent-guidance`: passed, 138 tests; Claude plugin drift check passed.
- Focused c8 diagnostic for `test-strategy*.mjs`: 99.47% lines and 92.22% branches before the final type-check
  hardening; this is a diagnostic measurement, not semantic effectiveness evidence or a changed threshold.
- Local log: `strategy-implementation-full.log` in the session's external temporary workspace (not packaged).
- Remote CI, independent review and real pilots have not been executed for this change.

### Post-merge implementation follow-up

The initial strategy implementation was merged in PR #147 (`665985a`). Publication is outside the current work
at maintainer request; implementation continues without depending on the open Release PR.
The TASK-P3-007 follow-up adds supplied-review evidence tooling, templates and regressions in a separate change.
It does not mark independent review, pilots or any release task Done.

Local verification for the follow-up:

- `npm run test:strategy-review-evidence`: 13 passing regressions, including stale hashes, self-review,
  reviewer conflicts, uncertainty, malformed records and unsafe/sensitive input.
- `npm run test:doc-consistency`: 33 passing tests.
- `npm run validate:oss-extraction`: 90 passing steps, including preparation from a packed installation.
- Source files: `.qa-ai/scripts/review-test-strategy.mjs` and `lib/strategy-review-evidence.mjs`.
- Review opinions are supplied data; no real human review or pilot was performed by these regressions.
- The follow-up is local and still requires review and remote CI before integration.

### Maintenance investigation follow-up — TASK-P5-001

PR #148 merged the supplied-review evidence tooling as `e43d3d2`; it did not complete human comparative review.
The next technical slice joins capability/test navigation, file-history counts and supplied execution summaries
inside the existing analyzer's `investigation` section. Duplicate IDs block automatic run association; missing,
unavailable, shallow and truncated data remain explicit. Shared file history is never summed as scenario effort
or capability maintenance totals. Causes require evidence and human review; no automatic actions are introduced.

Development regressions cover exact joins, shared files, ambiguous IDs, orphan runs, missing inputs, shallow/truncated
history, revision differences, Spanish labels and renamed Git files. This slice remains In validation; neither
independent acceptance nor pilots have been performed.

Local verification: `test:maintenance-investigation` (9 tests), `test:strategy-analysis` (15 tests),
`test:doc-consistency` (34 tests), lint, formatting, documentation consistency and the full 90-step
`validate:oss-extraction` suite pass. Packed installation checks the diagnostic boundary; npm-pack verification
passes with 598 files. Remote CI and integration of this slice remain pending.
