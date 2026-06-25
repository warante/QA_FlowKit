# Stable `1.0.0` Release PR review (TASK-084)

Machine-readable record: [`stable-release-pr.v1.json`](stable-release-pr.v1.json).

**Status:** `awaiting_release_pr`  
**Depends on:** [`stable-release-config.v1.json`](stable-release-config.v1.json) → `merged`

## When release-please opens the Release PR

Title pattern: `chore: release 1.0.0`

Review these paths (also listed in the JSON record):

| Path                                | Check                                             |
| ----------------------------------- | ------------------------------------------------- |
| `package.json`                      | Version is exactly `1.0.0` (no prerelease suffix) |
| `.release-please-manifest.json`     | Matches `1.0.0`                                   |
| `CHANGELOG.md`                      | New `1.0.0` section; factual highlights only      |
| `plugin/.claude-plugin/plugin.json` | Version aligned                                   |
| `.claude-plugin/marketplace.json`   | Plugin version aligned                            |

## Release notes checklist

Copy [`stable-release-notes.template.md`](stable-release-notes.template.md) into the GitHub Release body and verify:

- Migration path (`@latest` / `npx qa-flowkit@latest update`)
- Link to [beta-to-1.0-migration.md](beta-to-1.0-migration.md)
- Stable contracts: [public-contracts.md](public-contracts.md), [stability-policy.md](stability-policy.md)
- Examples and known limitations are accurate

## Before merge

- [ ] TASK-083 stable config is `merged` on `main`
- [ ] Full CI green on the Release PR head commit
- [ ] `npm run validate:oss-extraction` and `node .github/scripts/verify-npm-pack.mjs` pass locally on the PR branch
- [ ] No manual git tag or local `npm publish`

## After merge

Update `stable-release-pr.v1.json`:

- `status: merged`
- `releasePrUrl`, `mergedAt`, `ciGreenOnPr: true`

Publish runs automatically via [release-please.yml](../../.github/workflows/release-please.yml) (dist-tag `latest`).

## Verification

```bash
npm run test:stable-release-pr
npm run test:stable-release-pr:unit
npm run test:e2e-stable-release-pr-rehearsal
```

Next: [TASK-085](stable-post-publish.md) post-publish verification.
