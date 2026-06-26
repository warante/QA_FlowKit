# RC known limitations (`1.0.0-rc`)

This document lists intentional scope limits and open risks while QA FlowKit is on the **`rc`** npm channel.
Update it for every `1.0.0-rc.N` release.

## Channel semantics

| Item           | RC behavior                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| npm dist-tag   | `rc` (`npx qa-flowkit@rc`)                                                                           |
| Semver         | `1.0.0-rc.N` only on this channel                                                                    |
| Stable `1.0.0` | Not published until Epic 20 after RC soak                                                            |
| API freeze     | Public contracts frozen per [stability-policy.md](stability-policy.md); fixes ship as `1.0.0-rc.N+1` |

## Known limitations

1. **Release-please RC policy is active on `main`** (`versioning: prerelease`, `prerelease-type: rc`). The next Release PR from release-please should propose `1.0.0-rc.N`; local `package.json` may still show the last beta until that Release PR merges.
2. **Private vulnerability reporting** (Epic 13 / TASK-053) is enabled; use [SECURITY.md](../../SECURITY.md) and GitHub Security Advisories for private disclosure.
3. **Pilot repositories** are not guaranteed to track `@rc` automatically; pin `qa-flowkit@rc` explicitly in CI and docs.
4. **npm registry propagation** can lag a few minutes after publish; post-publish jobs retry `npm view` before failing.
5. **No npm unpublish** for widely consumed RC builds; ship forward fixes as the next `1.0.0-rc.N`.
6. **Example compatibility** scheduled runs default to `@beta`; switch to `rc` via workflow_dispatch after the first RC publish (see [example-compatibility.yml](../../.github/workflows/example-compatibility.yml)).
7. **P1-002 / P1-003** (independent checklist and migration walkthrough) close during **early RC soak** with `npx qa-flowkit@rc` and must be done before TASK-082 (`rc-soak-status.v1.json` → `earlySoakHumanGates`).
8. **Cross-functional sign-offs** for stable `1.0.0` are required at **TASK-082** ([`stable-release-approval.v1.json`](stable-release-approval.v1.json)), not before the first RC publish.

## Stable disposition (TASK-082)

Final known-issues and risk acceptance for stable `1.0.0` are recorded in
[`stable-release-approval.v1.json`](stable-release-approval.v1.json). Update this section when TASK-082 is approved.

Current state: **pending** — RC soak not complete; stable go/no-go sign-offs recorded in TASK-082.

## Out of scope for RC

- Manual `npm publish` from a developer machine.
- Hand-edited `package.json` version bumps for shipping.
- Git tags `v*` pushed outside release-please.
- Breaking changes to frozen CLI JSON contracts without a soak clock reset (TASK-081).

## Validation coverage

| Check                   | Command / workflow                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Local RC smoke (pack)   | `npm run test:rc-post-publish -- --local-simulation`                                           |
| Live registry RC smoke  | `node .github/scripts/run-rc-post-publish-validation.mjs --version 1.0.0-rc.N`                 |
| Maintainer workflow     | [rc-post-publish.yml](../../.github/workflows/rc-post-publish.yml) (`workflow_dispatch`)       |
| Publish job (automatic) | [release-please.yml](../../.github/workflows/release-please.yml) when version matches `*-rc.*` |

## Feedback

File structured feedback with the [RC feedback issue template](../../.github/ISSUE_TEMPLATE/rc-feedback.yml).

## Related documents

- [Beta to RC release guide](beta-to-rc-release.md)
- [RC soak status](rc-soak-status.v1.json)
- [Stable release config](stable-release-config.md)
- [Stable Release PR review](stable-release-pr.md)
- [Stable post-publish verification](stable-post-publish.md)
- [Stable announcement](stable-announcement.md)
- [RC release notes template](rc-release-notes.template.md)
- [Beta to 1.0 migration](beta-to-1.0-migration.md)
- [Open risk register](open-risk-register.v1.json)
