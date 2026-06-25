# Stable post-publish verification (TASK-085)

Machine-readable record: [`stable-post-publish.v1.json`](stable-post-publish.v1.json).

**Status:** `awaiting_publish`  
**Depends on:** TASK-084 Release PR merged and automatic publish to npm `latest`

## Automatic path

When release-please publishes stable semver (no prerelease suffix), the publish job in
[release-please.yml](../../.github/workflows/release-please.yml) runs:

```bash
node .github/scripts/run-stable-post-publish-validation.mjs --version 1.0.0
```

## Manual retry

Workflow: [stable-post-publish.yml](../../.github/workflows/stable-post-publish.yml) (`workflow_dispatch`)

## Local rehearsal (before publish)

```bash
npm run test:stable-post-publish -- --local-simulation
npm run test:stable-post-publish:unit
npm run test:stable-post-publish-status
```

## Post-publish checklist (maintainers)

1. Confirm `npm view qa-flowkit version` and `npm view qa-flowkit dist-tags` show `latest` → `1.0.0`.
2. Run stable post-publish validation (automatic or workflow).
3. Run **Example compatibility** with channel `latest`.
4. Record evidence in the release issue; update `stable-post-publish.v1.json` check statuses to `passed`.
5. Set `status: completed` when all checks pass.

## Scope

| Check                        | Coverage                                                       |
| ---------------------------- | -------------------------------------------------------------- |
| Registry + dist-tag `latest` | `run-stable-post-publish-validation.mjs` (registry mode)       |
| Pack allowlist               | `npm pack` + `validatePackFileList` on published tarball       |
| Clean install `@latest`      | init, doctor, validators, run start/status                     |
| Beta migration update        | oldest-supported-beta fixture + `update`                       |
| Examples                     | `example-compatibility.yml` channel `latest` (human/scheduled) |

Next: [TASK-086](stable-announcement.md) announce stable availability.
