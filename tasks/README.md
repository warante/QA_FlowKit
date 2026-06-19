# QA FlowKit 1.0 Implementation Plan

This directory is the executable delivery plan from the current beta line to stable `1.0.0`.
[`ROADMAP.md`](../ROADMAP.md) remains the strategic summary; these files define the work, owners, dependencies,
validation evidence and release gates.

Lifecycle terms, support claims and version-reference rules are defined in the
[stability policy](../docs/qa-ai/stability-policy.md).

## Relationship to Product Expansion

Epics 13-20 remain the stabilization plan for the beta-to-`1.0.0` path. Product expansion work lives in
the product expansion section of [`ROADMAP.md`](../ROADMAP.md) with its own `EPIC-P*` identifiers; do not mix those IDs
with the historical task ranges in this directory.

## Planning principles

- Stabilize before expanding scope.
- Every behavior change includes tests, user documentation and migration impact.
- Every task has one accountable owner, even when several disciplines contribute.
- Claims about security, compatibility and productivity require reproducible evidence.
- External writes and hosted services are not required for `1.0.0`.
- Releases continue through release-please; no task authorizes a manual version bump, local `npm publish` or `v*` tag.

## Status model

Use one of: `Planned`, `Ready`, `In progress`, `Blocked`, `In validation`, `Done`, `Deferred`.

A task can move to `Done` only when:

1. implementation and review are complete;
2. task-specific tests pass;
3. relevant E2E scenarios pass;
4. CI changes are active and green;
5. documentation and migration notes are updated;
6. acceptance evidence is linked from the task or PR;
7. no unresolved P0/P1 defect remains in the delivered scope.

## Delivery team

| Profile                       | Accountability                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------- |
| Product manager               | Scope, outcomes, prioritization, pilot recruitment and release go/no-go                 |
| Engineering lead              | Architecture, sequencing, technical decisions and cross-epic integration                |
| CLI/framework engineer        | CLI, config, harness, validators, packaging and migrations                              |
| QA lead                       | Overall test strategy, quality gates, defect severity and release quality sign-off      |
| QA automation engineer        | Test strategy, fixtures, E2E implementation and regression analysis                     |
| Security engineer             | Threat model, permission boundaries, secret handling and release security review        |
| Developer experience engineer | Init/update usability, error messages, examples and contributor workflow                |
| Technical writer              | README, reference docs, migration guides, release notes and terminology consistency     |
| Developer relations           | Demo, public examples, adopter onboarding and feedback collection                       |
| UX researcher                 | Evaluator studies, task success criteria and first-use friction analysis                |
| Data analyst                  | Pilot baseline, metric definitions, anonymization and outcome reporting                 |
| Release engineer              | CI matrix, release-please, npm provenance, RC rehearsal and stable release verification |
| Maintainer/reviewer           | Human approval for scope, release readiness and npm/GitHub administrative settings      |

Small teams may combine profiles, but the accountability must still be covered explicitly in each task.

## Epic sequence

| Epic | File                                                          | Primary outcome                                  | Depends on                   |
| ---- | ------------------------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| 13   | [Product baseline](EPIC-13-product-baseline.md)               | Consistent, automatically checked product claims | Existing beta                |
| 14   | [First-use experience](EPIC-14-first-use-experience.md)       | Clear 30-second pitch and five-minute path       | Epic 13                      |
| 15   | [Public examples](EPIC-15-public-examples.md)                 | Reproducible end-to-end reference repositories   | Epics 13-14                  |
| 16   | [Pilots and metrics](EPIC-16-pilots-and-metrics.md)           | External evidence across three QA contexts       | Epics 14-15                  |
| 17   | [Contract stability](EPIC-17-contract-stability.md)           | Versioned and migration-tested 1.0 contracts     | Epic 13; informed by Epic 16 |
| 18   | [Trust and compatibility](EPIC-18-trust-and-compatibility.md) | Verified security and agent support claims       | Epics 15 and 17              |
| 19   | [Release candidate](EPIC-19-release-candidate.md)             | Proven `1.0.0-rc` with full readiness evidence   | Epics 13-18                  |
| 20   | [Stable release](EPIC-20-stable-release.md)                   | Publish and verify `1.0.0` on npm `latest`       | Epic 19                      |

Epics 14 and 17 may begin after Epic 13's terminology decisions are approved. Pilot recruitment may begin early,
but pilot execution uses the stable demo and measurement protocol from Epics 14-16.

## Delivery cadence and critical path

This is a sequencing estimate, not a release-date commitment. Pilot recruitment and external feedback are the largest
schedule variables.

| Delivery window  | Primary work                   | Parallel work                                           | Exit                              |
| ---------------- | ------------------------------ | ------------------------------------------------------- | --------------------------------- |
| Iteration 1      | Epic 13 product baseline       | Pilot recruitment                                       | M1                                |
| Iterations 2-3   | Epic 14 first-use experience   | Epic 15 example foundations                             | README, quick path and demo ready |
| Iterations 3-5   | Epic 15 public examples        | Epic 16 protocol and recruitment                        | M2                                |
| Iterations 5-8   | Epic 16 pilot execution        | Epic 17 contract inventory and migration fixture design | M3                                |
| Iterations 8-10  | Epic 17 contract closure       | Epic 18 threat model and adapter test design            | M4                                |
| Iterations 10-12 | Epic 18 trust and CI hardening | RC preparation                                          | M5                                |
| Iterations 13-14 | Epic 19 RC publication         | Documentation freeze and support preparation            | RC starts                         |
| Minimum 14 days  | RC soak and defect closure     | Stable release rehearsal                                | M6                                |
| Release window   | Epic 20 stable publication     | Post-publish verification                               | M7                                |

Critical path:

```text
Epic 13 -> Epic 14 -> Epic 15 -> Epic 16 -> Epic 17 closure
         -> Epic 18 closure -> Epic 19 RC + soak -> Epic 20 stable
```

Contract inventory and test-fixture design may run in parallel with pilots, but the contract freeze cannot close until
pilot decisions are incorporated.

## Task ranges

| Range                | Scope                                                             |
| -------------------- | ----------------------------------------------------------------- |
| TASK-051 to TASK-054 | Product baseline and consistency automation                       |
| TASK-055 to TASK-058 | README, quick path, demo and onboarding usability                 |
| TASK-059 to TASK-062 | Manual, Playwright, Karate and Maestro+Karate references          |
| TASK-063 to TASK-067 | Pilot protocol, three pilots and outcome analysis                 |
| TASK-068 to TASK-072 | Contract inventory, schemas, migration, freeze and packaging      |
| TASK-073 to TASK-077 | Threat model, adversarial tests, adapters, CI and security review |
| TASK-078 to TASK-082 | Readiness audit, RC publication, soak and stable approval         |
| TASK-083 to TASK-087 | Stable release, verification, announcement and retrospective      |

## Milestone gates

### Gate M1 - Product baseline

- Version and maturity references use one source-of-truth strategy.
- `SECURITY.md` matches actual CI behavior and has a usable private reporting path.
- CI detects stale versions, inconsistent lifecycle terms and documented command drift.

### Gate M2 - Adoption path

- README communicates problem, outcome, demo, installation and limits in the first screenful.
- One evaluator completes the five-minute path without maintainer intervention.
- Manual-only and automation reference examples are reproducible from a clean clone.

### Gate M3 - External validation

- At least three pilots represent quick, standard and enterprise or equivalent complexity.
- Before/after metrics and qualitative findings use the same protocol.
- Findings, limitations and resulting changes are published without private data.

### Gate M4 - Contract freeze

- CLI, config, workflow, run-state and validator contracts have explicit stability classifications.
- Migration from supported beta versions is tested.
- Breaking changes require a documented migration path and are closed before RC.

### Gate M5 - Trust baseline

- Threat model and security boundary documentation match implementation.
- Adapter support levels distinguish generated, smoke-tested and human E2E-verified support.
- The required E2E suite runs in CI or has a documented, signed manual evidence process where automation is impossible.

### Gate M6 - Release candidate

- `1.0.0-rc` passes all release checks and a minimum 14-day soak.
- No unresolved P0/P1 defect; P2 exceptions have owner, rationale and follow-up milestone.
- Install, update and rollback rehearsal evidence is complete.

### Gate M7 - Stable

- Stable release configuration is reviewed by a human maintainer.
- Release Please publishes `1.0.0` to `latest`.
- npm registry, tarball, clean install, update and basic workflow smoke verification pass after publication.

## Common validation matrix

Every implementation PR runs the smallest relevant subset locally and the complete mandatory suite before merge:

```bash
npm ci
npm run lint
npm run format:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
git diff --check
```

Required E2E scenarios by 1.0:

| ID      | Scenario                                                                                                   | Environments                                           |
| ------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| E2E-01  | Clean `manual-only` quick init, help, run start/next/check and strict validation                           | Ubuntu/Windows, Node 20/22                             |
| E2E-02  | Standard Playwright UI + API target from requirement to PR summary                                         | Ubuntu and Windows                                     |
| E2E-03  | Karate target with design and executable feature validation                                                | Ubuntu and Windows                                     |
| E2E-03M | Maestro mobile flows + Karate API, structural CI and declared host-mobile evidence                         | Ubuntu/Windows plus selected mobile hosts              |
| E2E-04  | Enterprise run through release gate, including blocked approval and recovery                               | Ubuntu/Windows                                         |
| E2E-05  | Update from oldest supported beta fixture while preserving config, artifacts and active run state          | Ubuntu/Windows                                         |
| E2E-06  | Packed tarball install in a clean directory and all primary CLI commands                                   | Ubuntu/Windows                                         |
| E2E-07  | Adapter bootstrap and interaction contract checks for every advertised adapter                             | Automated content checks plus selected human host runs |
| E2E-08  | Failure paths: unsafe paths, secret-like content, overwrite refusal, retry exhaustion and invalid contract | Ubuntu/Windows                                         |
| E2E-09  | Stable release dry run and post-publish verification against an RC package                                 | Ubuntu                                                 |

CI must preserve these named checks or document their replacement:

- npm pack allowlist;
- adapter template parity;
- golden target;
- Karate target;
- starter validation;
- OS/Node matrix;
- CodeQL;
- release-please pre-publish validation.

## Documentation rule

Each task explicitly lists documentation deliverables. At minimum, behavior changes update:

- public README or a linked user guide;
- CLI/config/reference documentation;
- troubleshooting for new failure modes;
- stability or migration documentation when contracts change;
- tests or transcripts that demonstrate actual output;
- `CHANGELOG.md` only through release-please release sections, except an established `Unreleased` workflow.

English and Spanish public entry documentation must remain semantically aligned.

## Review and evidence

Use [REVIEW-CHECKLIST.md](REVIEW-CHECKLIST.md) at every milestone and before the RC. The initial completed review is
recorded in [PLAN-REVIEW.md](PLAN-REVIEW.md). Evidence should be stored in versioned fixtures/docs when public, or
linked from issues/PRs when it contains operational details. Pilot data must be anonymized and must never include
secrets, credentials, private URLs or personal data.

The common measurement protocol and privacy-safe record format are defined in
[`docs/qa-ai/pilot-methodology.md`](../docs/qa-ai/pilot-methodology.md). Validate committed pilot records with
`npm run pilots:analyze`.
