# Stable release-please configuration (TASK-083)

Machine-readable record: [`stable-release-config.v1.json`](stable-release-config.v1.json).

**Status:** `prepared` (active config remains **rc** until maintainer merge of stable policy)  
**Depends on:** [`stable-release-approval.v1.json`](stable-release-approval.v1.json) → `approved`

## Merge procedure (maintainers)

1. Confirm TASK-082 approval (`epic20Unblocked: true`).
2. Open a PR that replaces `.release-please-config.json` with `.release-please-config.stable.json`.
3. Do **not** hand-edit `package.json`, `.release-please-manifest.json` or `CHANGELOG.md` in that PR.
4. Merge when CI is green on the PR commit.
5. Update `stable-release-config.v1.json`:
   - `status: merged`
   - `mergedAt` (ISO date)
   - `mergePrUrl` (GitHub PR link)
6. Let release-please open the `chore: release 1.0.0` Release PR ([TASK-084](stable-release-pr.md)).

## Local verification

```bash
npm run test:stable-release-config
npm run test:stable-release-config:unit
npm run test:e2e-stable-config-rehearsal
```

Rehearse release-please against the prepared stable file:

```bash
RELEASE_PLEASE_CONFIG_FILE=.release-please-config.stable.json node .github/scripts/run-release-please.mjs
```

## Expected behavior after merge

| Item                    | Value    |
| ----------------------- | -------- |
| `prerelease`            | `false`  |
| `prerelease-type`       | unset    |
| Next Release PR version | `1.0.0`  |
| npm dist-tag on publish | `latest` |
