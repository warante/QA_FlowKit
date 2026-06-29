# 1.0 Readiness Audit

Machine-readable record: [`readiness-audit.v1.json`](readiness-audit.v1.json). Open risks:
[`open-risk-register.v1.json`](open-risk-register.v1.json).

**Audit date:** 2026-06-25  
**Package line:** `1.0.0-rc.3` (npm `rc`)  
**Task:** TASK-078 (Epic 19)  
**Decision:** `PASS_WITH_ACTIONS`

## Summary

Automated validation, contract freeze (Epic 17) and trust baseline (Epic 18) are complete with CI matrix coverage on
Ubuntu and Windows. Epics 13–16 retain documented gaps captured in the open risk register; accepted P2/P3 items do not
block publishing `1.0.0-rc`.

RC publish (`TASK-080`) requires:

1. Decision `PASS` or `PASS_WITH_ACTIONS` with no open P0 blockers.
2. Maintainer confirms human-only checks in [`security-readiness.md`](security-readiness.md).
3. Full CI and CodeQL green on the candidate commit.

**Deferred to early RC soak (`1.0.0-rc`)** — must complete before TASK-082 stable approval:

4. An **independent** reviewer completes [`tasks/REVIEW-CHECKLIST.md`](../../tasks/REVIEW-CHECKLIST.md) (P1-002).
5. A **non-author** follows [`beta-to-1.0-migration.md`](beta-to-1.0-migration.md) with `npx qa-flowkit@rc` (P1-003).

**Cross-functional go/no-go sign-offs** for stable `1.0.0` are recorded in
[`stable-release-approval.v1.json`](stable-release-approval.v1.json) during **TASK-082**, after RC soak completes —
not before the first RC publish.

## Epic gate review

| Epic | Milestone | Status        | Notes                                                            |
| ---- | --------- | ------------- | ---------------------------------------------------------------- |
| 13   | M1        | done          | TASK-053: Private Vulnerability Reporting confirmed (2026-06-26) |
| 14   | M2        | in validation | E2E-01 green; usability study pending                            |
| 15   | M2        | in_validation | Examples validated in CI                                         |
| 16   | M3        | deferred      | Accepted risk P2-001 for RC                                      |
| 17   | M4        | done          | Contract freeze + E2E-05/06                                      |
| 18   | M5        | done          | Threat model + E2E-07/08                                         |

## E2E scenario status

| ID      | Status    | Verification                         |
| ------- | --------- | ------------------------------------ |
| E2E-01  | automated | `npm run test:e2e-quick`             |
| E2E-02  | automated | `npm run test:e2e-playwright`        |
| E2E-03  | automated | `npm run test:e2e-karate`            |
| E2E-03M | automated | `npm run test:e2e-mobile`            |
| E2E-04  | partial   | Harness/validator tests (see P3-001) |
| E2E-05  | automated | `npm run test:e2e-update-migration`  |
| E2E-06  | automated | `npm run test:e2e-clean-install`     |
| E2E-07  | automated | `npm run test:adapter-support`       |
| E2E-08  | automated | `npm run test:e2e-adversarial`       |
| E2E-09  | automated | `npm run test:e2e-release-dry-run`   |

## Documentation parity

English and Spanish entry documentation is checked by `npm run docs:check` (lifecycle terminology, channel language and
linked validation commands). Root README structures are aligned; deeper guide parity is spot-checked during release
review.

## Local validation gate

```bash
npm ci
npm run lint
npm run format:check
npm run docs:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
npm run test:readiness-audit
```

CI must also be green on the candidate commit, including CodeQL `Analyze JavaScript`.

## Open risks (summary)

| ID     | Severity | Title                                   | Status                     |
| ------ | -------- | --------------------------------------- | -------------------------- |
| P1-001 | P1       | GitHub Private Vulnerability Reporting  | closed                     |
| P1-002 | P1       | Independent REVIEW-CHECKLIST pass       | open (deferred to RC soak) |
| P1-003 | P1       | Non-author migration walkthrough        | open (deferred to RC soak) |
| P2-001 | P2       | Epic 16 pilots deferred                 | accepted                   |
| P2-002 | P2       | Epic 14/15 formal sign-off              | open                       |
| P3-001 | P3       | Dedicated E2E-04 runner                 | accepted                   |
| P3-002 | P3       | Live RC publish verification (TASK-080) | open                       |

Full register: [`open-risk-register.v1.json`](open-risk-register.v1.json).

## Next steps

1. **TASK-080** — merge the release-please Release PR for `1.0.0-rc.N` (RC config is active on `main`).
2. **TASK-081** — 14-day minimum soak (`rc-soak-status.v1.json`); close P1-002/P1-003 during early soak.
3. **TASK-082** — cross-functional go/no-go sign-offs and stable release approval (`stable-release-approval.v1.json`) unblocks Epic 20.
