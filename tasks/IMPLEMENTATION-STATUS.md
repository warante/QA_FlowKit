# Implementation Status Snapshot

**Checked:** 2026-11-22 (Europe/Madrid).
**Source baseline:** `main` commit `b3eee7a77ced33282712dd05d339d4215e498985`.
This is a dated evidence snapshot, not an automatically refreshed dashboard or release approval.

## Two separate progress measures

The original [1.0 plan](README.md) tracks stabilization in Epics 13-20.
The [strategy incorporation plan](PRODUCT-STRATEGY-INCORPORATION.md) adds eight expansion tasks inside
P3/P5 without changing those milestones or their release gates.
Do not merge the two denominators or interpret task counts as engineering effort.

### Recorded historical task statuses

Count task headings in `tasks/EPIC-13-*.md` through `EPIC-20-*.md`, not epic headers.
There are **38 tasks**, including TASK-060M in addition to TASK-051 through TASK-087.

| Recorded state          | Count | Interpretation                                        |
| ----------------------- | ----- | ----------------------------------------------------- |
| Done                    | 14    | TASK-051-054 and TASK-068-077                         |
| In validation           | 17    | TASK-055-057, TASK-059/060/060M/061/062, TASK-078-086 |
| Deferred                | 5     | TASK-063-067; pilots intentionally postponed          |
| Planned                 | 1     | TASK-058; external onboarding evaluation              |
| No explicit task status | 1     | TASK-087; post-stable retrospective                   |
| Total                   | 38    | 14 closed; 24 not recorded Done                       |

Thus **14/38 (about 37%) are formally recorded Done**, not “37% of the code implemented”.
Many of the 17 validation tasks already contain code, documentation and tests; they cannot be counted
as fully accepted without their remaining evidence and reviews.

### Position by milestone

| Milestone        | Evidence and recorded state                                                         | Remaining closure                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| M1 / Epic 13     | All four tasks Done; epic header still Blocked                                      | Reconcile header with milestone evidence; do not infer approval from task count                                         |
| M2 / Epics 14-15 | Quick path, tutorial and reference implementations exist; eight tasks In validation | Independent first-use evaluation and recorded acceptance                                                                |
| M3 / Epic 16     | Methodology/templates/analyzer exist; five tasks Deferred                           | Approve protocol, execute three comparable pilots and evaluate outcomes, or record an explicit release-policy exception |
| M4 / Epic 17     | Five tasks Done                                                                     | Preserve contract and migration evidence when further changes are proposed                                              |
| M5 / Epic 18     | Five tasks Done                                                                     | Do not equate CI completion with all human settings/sign-offs being approved                                            |
| M6 / Epic 19     | Published RC exists; five tasks In validation                                       | Reconcile RC evidence, record soak and independent reviews, then stable go/no-go                                        |
| M7 / Epic 20     | Release preparation exists; four tasks In validation; retrospective lacks status    | Approved stable transition, publication, live verification, announcement and 30-day review                              |

The product is already on the RC line technically, but that does not prove M1-M6 have all been
formally closed. Deferred pilots versus release-gate wording require an explicit maintainer decision.

## External evidence checked

- `npm view qa-flowkit dist-tags --json`: `rc` is `1.0.0-rc.14`; `latest` remains `1.0.0-rc.7`.
  Neither channel is a stable `1.0.0` release.
- [Release PR #142](https://github.com/warante/QA_FlowKit/pull/142), `chore: release 1.0.0-rc.15`,
  remains open at this snapshot.
- [Mutation run](https://github.com/warante/QA_FlowKit/actions/runs/44990006188),
  [example compatibility](https://github.com/warante/QA_FlowKit/actions/runs/43879132421) and
  [CodeQL](https://github.com/warante/QA_FlowKit/actions/runs/43871142161) succeeded on the source baseline.
- Publication/traceability and bounded mutation repairs are already incorporated in `main`.
- An open dependency update, [PR #146](https://github.com/warante/QA_FlowKit/pull/146), is separate from this plan.

## Evidence discrepancies to resolve, not silently mark complete

1. TASK-080 text still says first RC publication is pending, despite the live registry channel.
   Reconcile exact-version provenance, install/update evidence and remaining acceptance before closing it.
2. `rc-soak-status.v1.json` remains `planned`, with no version, start/end dates or near-end replays.
   Do not infer a completed 14-day soak from the age of an npm release.
3. `stable-release-approval.v1.json` remains `pending`, with `epic20Unblocked: false`;
   P1-002/P1-003 and cross-functional sign-offs remain unclosed in the record.
4. Epic 13's header and completed task statuses disagree; TASK-087 has no explicit status.
5. Tutorial capture is present, but TASK-057 retains stale “recorded capture pending” wording.
   A recording alone does not establish independent first-use success.

This planning update records these discrepancies without rewriting signed/machine-readable evidence,
fabricating dates, waiving pilot gates or granting release approval.

## New strategy implementation: local delivery in validation, 0/8 formally Done

| Slice | Tasks             | Local technical preparation | What exists now                                                                               |
| ----- | ----------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| A     | P3-001 to P3-003  | 3/3 in validation           | Guidance, optional tables, structural diagnostics and bilingual examples                      |
| B     | P3-004 to P3-006  | 3/3 in validation           | Benefit/ACC enrichment, charters and a derived read-only capability index                     |
| C     | P3-007 and P5-001 | 2/2 tooling in validation   | Structural fixture evaluator and Git/execution diagnostics; semantic evaluation not completed |

All eight tasks have local technical implementation or evaluation tooling; none is independently accepted or
merged by this change. Existing config/workflow schemas and release gates are unchanged. New analysis is advisory.
The [implementation record](PRODUCT-STRATEGY-INCORPORATION.md#implementation-record) links actual delivered surfaces.
Independent semantic review, first-use studies, pilots and release evidence are scheduled in
[FINAL-ACCEPTANCE.md](FINAL-ACCEPTANCE.md), not treated as completed.

## Remaining work and estimates

- Stabilization: **24/38 tasks are not formally Done**, including 17 awaiting validation, five deferred,
  one planned and one without explicit status. Counts are unweighted, not a reliable percentage of effort remaining.
- Strategy enhancements: **8/8 await final acceptance**, with local technical preparation now present.
  The original **13-23 engineering person-days** was a planning estimate, not measured work or a remaining-duration
  guarantee. Findings from final review may require additional implementation.
- Release timing: no defensible stable date until soak start/restarts, independent reviews, pilot disposition
  and approvals are recorded. The existing minimum 14-day soak is a prerequisite, not a delivery estimate.
- Next action: finish implementation validation, review the local diff and then execute the final acceptance queue.
  Release-evidence reconciliation may run in parallel but must not be reported as enhancement acceptance.

Update this snapshot after accepted task completion or a release decision, using new evidence rather
than automatically advancing dates, percentages or statuses.
