# Beta to RC and RC to Stable Release

This guide describes the release-please policy files for the `1.0.0` path. The active configuration on `main` uses
the **RC** line (`prerelease-type: rc`) after the RC transition PR (TASK-080).

Policy files:

| File                                 | Purpose                                            | npm dist-tag for `1.0.0-rc.N` / `1.0.0` |
| ------------------------------------ | -------------------------------------------------- | --------------------------------------- |
| `.release-please-config.json`        | **Active** RC line (`prerelease-type: rc`)         | `rc`                                    |
| `.release-please-config.rc.json`     | Prepared RC reference (matches active after merge) | `rc`                                    |
| `.release-please-config.stable.json` | Prepared stable transition (`prerelease: false`)   | `latest`                                |

Automated checks: `npm run test:release-policy` and `npm run test:e2e-release-dry-run` (E2E-09).

## Beta → `1.0.0-rc` (TASK-080)

Prerequisites:

- [`readiness-audit.md`](readiness-audit.md) decision is `PASS` or accepted `PASS_WITH_ACTIONS` with no open P0
  blockers. P1-002 and P1-003 may remain open for early RC soak and must close before TASK-082 (see
  [`rc-soak-status.v1.json`](rc-soak-status.v1.json) `earlySoakHumanGates`).
- [`security-readiness.md`](security-readiness.md) human checks complete.
- Full CI and CodeQL green on the candidate commit.

Steps (maintainers):

1. Open a PR that replaces `.release-please-config.json` with the contents of `.release-please-config.rc.json` (or merge
   the RC config file by setting `prerelease-type` to `rc`).
2. Merge feature work to `main` with conventional PR titles as usual.
3. Let **release-please** open/update the Release PR (`chore: release 1.0.0-rc.N`). Do **not** hand-edit
   `package.json` versions.
4. Review the Release PR: version `1.0.0-rc.N`, changelog, plugin manifests.
5. Merge the Release PR. The publish job in [`.github/workflows/release-please.yml`](../../.github/workflows/release-please.yml):
   - runs `validate:oss-extraction` and `verify-npm-pack.mjs`;
   - resolves dist-tag **`rc`** for `1.0.0-rc.N`;
   - publishes with provenance (`npm publish --provenance --access public --tag rc`);
   - post-publish: full RC validation (`run-rc-post-publish-validation.mjs`) including dist-tag `rc`, clean install and beta migration smoke.

After the first RC is on npm:

1. Run **RC post-publish validation** workflow (or rely on the publish job).
2. Switch scheduled **Example compatibility** to channel `rc`.
3. Publish GitHub Release notes from [rc-release-notes.template.md](rc-release-notes.template.md).
4. Track limitations in [rc-known-limitations.md](rc-known-limitations.md).
5. Collect feedback via [rc-feedback.yml](../../.github/ISSUE_TEMPLATE/rc-feedback.yml).

Optional rehearsal before merge:

```bash
npm run test:e2e-release-dry-run
npm run test:release-policy
npm run test:rc-post-publish -- --local-simulation
```

To run release-please against the RC config in a fork or dry environment:

```bash
RELEASE_PLEASE_CONFIG_FILE=.release-please-config.rc.json node .github/scripts/run-release-please.mjs
```

## RC soak (TASK-081)

- Minimum **14 calendar days** unless a longer window is approved.
- Restart soak after any fix that changes a **frozen public contract**.
- Monitor scheduled example compatibility (`example-compatibility.yml`) and RC feedback.
- Keep the machine-readable soak record in [`rc-soak-status.v1.json`](rc-soak-status.v1.json).
- Verify the soak record locally with:

```bash
npm run test:rc-soak
npm run test:rc-soak:unit
```

Minimum closure checklist for TASK-081:

1. Set `status` to `in_progress` with `rcVersion` and `soakStartDate` after first `1.0.0-rc.N` publish.
2. Run example compatibility using channel `rc` and record runs in `checks.exampleCompatibilityRunsNearEnd`.
3. Replay one clean install and one beta update near soak end, then set both replay checks to `passed`.
4. Keep `riskAcceptance.openP0/openP1` aligned with `open-risk-register.v1.json`.
5. Only set `status` to `completed` after at least 14 full days and zero open P0/P1.

## Stable release approval (TASK-082)

Do **not** merge `.release-please-config.stable.json` until TASK-082 is `approved`.

- Record: [`stable-release-approval.v1.json`](stable-release-approval.v1.json)
- Guide: [`stable-release-approval.md`](stable-release-approval.md)
- Verify locally:

```bash
npm run test:stable-release-approval
npm run test:stable-release-approval:unit
```

Approval checklist:

1. Confirm `rc-soak-status.v1.json` is `completed` and P1-002/P1-003 are closed in `open-risk-register.v1.json`.
2. Complete **Fase 2 — cross-functional sign-offs** (see [`stable-release-approval.md`](stable-release-approval.md)) and
   record them in `stable-release-approval.v1.json`.
3. Set `stablePolicyMergeApproved: true`, `decision: GO` (or `GO_WITH_ACCEPTED_RISKS`), `status: approved`,
   `epic20Unblocked: true`.
4. Update [`rc-known-limitations.md`](rc-known-limitations.md) with final known-issues disposition.

## RC → stable `1.0.0` (Epic 20 / TASK-083)

Do **not** merge the stable policy before RC soak and [`TASK-082`](../../tasks/EPIC-19-release-candidate.md) approval.

Record: [`stable-release-config.v1.json`](stable-release-config.v1.json) · Guide: [`stable-release-config.md`](stable-release-config.md)

Verify locally:

```bash
npm run test:stable-release-config
npm run test:e2e-stable-config-rehearsal
```

Steps (maintainers):

1. Confirm TASK-082 `stable-release-approval.v1.json` is `approved`.
2. Merge a PR that replaces `.release-please-config.json` with `.release-please-config.stable.json` (`prerelease:
false`, no `prerelease-type`). Do **not** hand-edit versions or changelog.
3. Update `stable-release-config.v1.json` → `status: merged`, `mergedAt`, `mergePrUrl`.
4. Merge the release-please Release PR for **`1.0.0`** (TASK-084, not `1.0.0-rc.N`). See
   [`stable-release-pr.v1.json`](stable-release-pr.v1.json) and [`stable-release-notes.template.md`](stable-release-notes.template.md).
5. Confirm publish uses dist-tag **`latest`** exactly once for stable semver.
6. Run post-publish verification from [release-checklist.md](release-checklist.md) and Epic 20 tasks.

### TASK-084 Release PR checklist

```bash
npm run test:stable-release-pr
npm run test:e2e-stable-release-pr-rehearsal
```

1. Review `package.json`, manifest, changelog and plugin versions for `1.0.0`.
2. Paste release notes from `stable-release-notes.template.md`.
3. Merge only when CI is green; update `stable-release-pr.v1.json` → `merged`.

## TASK-085 post-publish

After merge, publish runs automatically. Verify with [`stable-post-publish.md`](stable-post-publish.md):

```bash
npm run test:stable-post-publish -- --local-simulation
```

## Rollback limitations

- npm does not support unpublishing a widely consumed version; yank only with npm policy approval.
- GitHub Releases and git tags created by release-please should not be deleted casually; ship a forward fix instead.
- Dist-tag moves (`npm dist-tag add`) are maintainer actions on npmjs.com and are not automated by this repository.
- Reverting `main` does not remove a published tarball; document incidents in the release issue.

## Failure recovery

| Failure point                        | Recovery                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------ |
| Pre-publish CI fails                 | Fix `main`, wait for green CI, re-run or open a new Release PR           |
| Publish succeeds but `npm view` lags | Publish job retries; if still failing, verify registry then re-run job   |
| Post-publish smoke fails             | Do not re-publish same version; patch with `1.0.0-rc.N+1` or `1.0.0` fix |
| Wrong dist-tag published             | Maintainer adjusts tag on npm; document in release issue                 |
| release-please cannot open PR (403)  | See [release-checklist.md](release-checklist.md) workflow permissions    |

Local publish and manual `v*` tags remain **out of scope**; use release-please or the manual fallback workflow only.
