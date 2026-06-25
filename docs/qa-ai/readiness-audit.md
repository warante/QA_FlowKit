# 1.0 Readiness Audit

Machine-readable record: [`readiness-audit.v1.json`](readiness-audit.v1.json). Open risks:
[`open-risk-register.v1.json`](open-risk-register.v1.json).

**Audit date:** 2026-06-25  
**Package line:** `0.5.8-beta.0`  
**Task:** TASK-078 (Epic 19)  
**Decision:** `PASS_WITH_ACTIONS`

## Summary

Automated validation, contract freeze (Epic 17) and trust baseline (Epic 18) are complete with CI matrix coverage on
Ubuntu and Windows. Epics 13–16 retain documented gaps that do not block technical RC rehearsal but require explicit
sign-off or acceptance before publishing `1.0.0-rc`.

RC creation is **not** approved until:

1. Cross-functional sign-offs in `readiness-audit.v1.json` are recorded.
2. An **independent** reviewer completes [`tasks/REVIEW-CHECKLIST.md`](../../tasks/REVIEW-CHECKLIST.md).
3. A **non-author** follows [`beta-to-1.0-migration.md`](beta-to-1.0-migration.md) successfully.
4. Maintainer confirms human-only checks in [`security-readiness.md`](security-readiness.md).

## Epic gate review

| Epic | Milestone | Status        | Notes                                                   |
| ---- | --------- | ------------- | ------------------------------------------------------- |
| 13   | M1        | blocked       | TASK-053: enable GitHub Private Vulnerability Reporting |
| 14   | M2        | in validation | E2E-01 green; usability study pending                   |
| 15   | M2        | in_validation | Examples validated in CI                                |
| 16   | M3        | deferred      | Accepted risk P2-001 for RC                             |
| 17   | M4        | done          | Contract freeze + E2E-05/06                             |
| 18   | M5        | done          | Threat model + E2E-07/08                                |

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

| ID     | Severity | Title                                   | Status   |
| ------ | -------- | --------------------------------------- | -------- |
| P1-001 | P1       | GitHub Private Vulnerability Reporting  | open     |
| P1-002 | P1       | Independent REVIEW-CHECKLIST pass       | open     |
| P1-003 | P1       | Non-author migration walkthrough        | open     |
| P2-001 | P2       | Epic 16 pilots deferred                 | accepted |
| P2-002 | P2       | Epic 14/15 formal sign-off              | open     |
| P3-001 | P3       | Dedicated E2E-04 runner                 | accepted |
| P3-002 | P3       | Live RC publish verification (TASK-080) | open     |

Full register: [`open-risk-register.v1.json`](open-risk-register.v1.json).

## Next steps

1. **TASK-080** — publish `1.0.0-rc` after go/no-go sign-offs and RC config merge.
2. **TASK-081** — 14-day minimum soak (`rc-soak-status.v1.json`).
3. **TASK-082** — stable release approval (`stable-release-approval.v1.json`) unblocks Epic 20.
