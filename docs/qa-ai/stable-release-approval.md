# Stable `1.0.0` release approval (TASK-082)

Machine-readable record: [`stable-release-approval.v1.json`](stable-release-approval.v1.json).

**Status:** `pending`  
**Milestone:** M6 gate → unblocks Epic 20 (M7)  
**Depends on:** completed RC soak ([`rc-soak-status.v1.json`](rc-soak-status.v1.json))

## Purpose

Record the maintainer go/no-go decision to merge the stable release-please policy and proceed with `1.0.0` on npm
`latest`. Do **not** merge `.release-please-config.stable.json` until this approval is `approved`.

## Prerequisites

| Gate                   | Evidence                                                                 |
| ---------------------- | ------------------------------------------------------------------------ |
| RC soak complete       | `rc-soak-status.v1.json` → `status: completed`                           |
| Stable policy prepared | `.release-please-config.stable.json`, `npm run test:release-policy`      |
| No open P0/P1          | `open-risk-register.v1.json` aligned with approval record                |
| Security human checks  | [`security-readiness.md`](security-readiness.md) pre-RC checklist        |
| Full CI green          | `Validate starter`, `Coverage`, `Analyze JavaScript` on candidate commit |

## Maintainer checklist

1. Confirm [`TASK-081`](../../tasks/EPIC-19-release-candidate.md) soak is `completed` with near-end replays recorded.
2. Complete **Fase 2 — cross-functional sign-offs** (below) and record them in `stable-release-approval.v1.json`.
3. Confirm human-only settings (`humanSettings` in JSON): npm Trusted Publishing, vulnerability reporting, branch
   protection, Dependabot configuration (`dependabotConfiguration`) and Dependabot PR triage (`dependabotTriaged`).
4. Set `stablePolicyMergeApproved: true` when the stable config PR is approved (merge happens in TASK-083).
5. Set `decision` to `GO` or `GO_WITH_ACCEPTED_RISKS`, `status` to `approved`, `epic20Unblocked: true`.
6. Update [`rc-known-limitations.md`](rc-known-limitations.md) with final known-issues disposition.

## Fase 2 — Sign-offs cross-funcionales (go/no-go stable `1.0.0`)

Run after RC soak completes and before merging `.release-please-config.stable.json`. Each role confirms in a PR or
issue (link it in the approval PR). Suggested value format: `"approved YYYY-MM-DD"` instead of `"pending"`.

| Rol                 | Campo JSON           | Responsable      |
| ------------------- | -------------------- | ---------------- |
| Product manager     | `productManager`     | PM               |
| Engineering lead    | `engineeringLead`    | Eng lead         |
| QA lead             | `qaLead`             | QA lead          |
| Security engineer   | `securityEngineer`   | Security         |
| Release engineer    | `releaseEngineer`    | Release engineer |
| Maintainer          | `maintainer`         | Maintainer       |

Each role confirms:

- [ ] Evidencia automatizada revisada (`readiness-audit.md`, soak completado, riesgos abiertos aceptados o cerrados)
- [ ] P1-002 y P1-003 **cerrados** (completados durante soak temprano con `npx qa-flowkit@rc`)
- [ ] Aceptan publicar stable `1.0.0` con P2-001 (pilots) y P3-001 (E2E-04 parcial) según risk register

Exit criterion: all `signOffs` in `stable-release-approval.v1.json` are no longer `"pending"`.

## Verification

```bash
npm run test:stable-release-approval
npm run test:stable-release-approval:unit
```

## Next step after approval

Epic 20 / [TASK-083](stable-release-config.md): merge stable release-please configuration on `main`.
