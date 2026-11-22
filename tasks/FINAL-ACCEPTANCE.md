# Final Acceptance Queue

**Scheduling decision:** 2026-11-22 (Europe/Madrid), requested by the maintainer in the implementation session.
**Status:** Pending; this queue changes execution scheduling, not release criteria or evidence.

## Implementation-first order

1. Implement remaining repository-local behavior, guidance, tools, examples and acceptance tooling.
2. Run focused regressions with each change; run full CI/packaging before merging the batch.
3. Conduct independent semantic review, first-use studies and real pilots.
4. Reconcile release evidence, perform/record the required RC soak and approve stable only after prerequisites pass.

Development regressions are not postponed: doing so would accumulate unverified changes.
Pilot deferral does not authorize closing M3/M4/M6/M7 or weakening the published stable-release gates.
A same-day code delivery objective does not waive the minimum soak or create human evidence.

## Deferred acceptance work

| Scope                     | Owner                          | Required evidence                                                                                  | Closure condition                                                                             |
| ------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| TASK-055-058 / M2         | UX researcher / QA lead        | Independent five-minute-path and onboarding review; reconcile tutorial task wording                | Actual evaluator evidence and reviewed acceptance                                             |
| TASK-059/060/060M/061/062 | QA lead                        | Clean-clone example/host evidence at each advertised support level                                 | Verified environments and limitations, not template-only claims                               |
| TASK-063-067 / M3         | Product manager / data analyst | Approved privacy protocol, consent, three comparable pilot results                                 | Recorded findings and scope decisions; explicit maintainer handling of any proposed exception |
| TASK-P3-001-006           | QA lead                        | Independent review of ambiguity, oracles, redesign, benefit, ACC and navigation examples           | No unapproved outcomes or behavior changes; regressions plus acceptance review                |
| TASK-P3-007               | QA lead                        | Structural evaluator output plus independent comparative semantic review                           | Retain/revise/defer decisions with limitations; no invented productivity claims               |
| TASK-P5-001               | Engineering lead               | Maintenance diagnostic review against known history and run context                                | Valid changes distinguished from fragile tests; no automatic quarantine                       |
| TASK-078-082 / M6         | Maintainer / QA / release lead | Current audit, near-end install/update replay, dated soak record, independent review and sign-offs | All actual release prerequisites satisfied                                                    |
| TASK-083-086 / M7         | Maintainer / release engineer  | Approved stable policy and release-please publication with live verification                       | Stable channel verified and announcement published                                            |
| TASK-087                  | Product manager                | Actual 30-day post-stable observations                                                             | Retrospective after the observation period, not before publication                            |

Keep historical task status and human evidence unchanged until actual acceptance. Technical preparation can be
`In validation`; neither this queue nor passing synthetic fixtures makes it `Done`.
Refer to [the strategy implementation record](PRODUCT-STRATEGY-INCORPORATION.md#implementation-record) for local delivery.

For TASK-P3-007, `review-test-strategy.mjs --plan <path> --json` prepares current comparison hashes without
inventing reviews; `--reviews <path>` checks actual supplied records and separate notes.
Use the [packaged guide](../.qa-ai/docs/test-strategy-guide.md#supplied-comparative-review-evidence).
Stale inputs, self-review, uncertain conclusions and conflicting reviewers remain unresolved.
The tool cannot verify a reviewer's identity or grant acceptance; a human must review the underlying evidence.
