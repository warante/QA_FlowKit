# Release Checklist

Step-by-step checklist for publishing a new QA FlowKit version to npm.

**Also read:** [AGENTS.md](../../AGENTS.md) § npm releases (agent constraints).

## For AI agents

Use this section when a user asks to release, publish to npm, bump the package version, or cut a GitHub Release. **Default: guide the human through release-please; do not perform release steps yourself unless explicitly asked to edit an open Release PR.**

### When to act vs defer

| Situation                                       | Agent action                                                                                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User wants a new npm version                    | Explain release-please flow; ensure their work is on `main` with a conventional PR title; tell them to merge the **Release PR** when it appears.                |
| User asks to bump `package.json` for release    | **Do not** bump manually. Point to the Release PR or to maintainer merge of feature PRs first.                                                                  |
| User asks to `npm publish`                      | **Refuse** local publish. Point to merge Release PR or human-run manual fallback workflow.                                                                      |
| User asks to add `NPM_TOKEN` to the repo        | **Refuse.** Tokens are GitHub secrets or npm Trusted Publishing (human setup on npmjs.com).                                                                     |
| Open Release PR exists (`chore: release X.Y.Z`) | May help review diff (`package.json`, `.release-please-manifest.json`, `CHANGELOG.md`) and run local validation commands below if asked.                        |
| Changing release automation                     | May edit `.github/workflows/release-please.yml`, `.release-please-config.json`, `verify-npm-pack.mjs` after reading [AGENTS.md](../../AGENTS.md) and this file. |

### Agent protocol (ordered)

1. **Read** [AGENTS.md](../../AGENTS.md) § npm releases and this checklist.
2. **Verify** feature work is merged (or will merge) to `main` with a conventional PR title (`feat:`, `fix:`, …).
3. **Run locally** (when validating before a Release PR merge):

   ```bash
   npm ci
   npm run lint
   npm run format:check
   npm run validate:oss-extraction
   node .github/scripts/verify-npm-pack.mjs
   ```

4. **Tell the maintainer** to merge the Release PR created by release-please (not to push `v*` tags).
5. **After merge**, publish is automatic. Maintainer may confirm with `npm view qa-flowkit version`.
6. **Never** run `npm publish`, create release tags, or commit secrets.

### Canonical files

| File                                   | Role                                                      |
| -------------------------------------- | --------------------------------------------------------- |
| `.release-please-config.json`          | Versioning rules, prerelease `beta`, changelog sections   |
| `.release-please-manifest.json`        | Last released version (release-please updates on release) |
| `.github/workflows/release-please.yml` | Release PR + npm publish on Release PR merge              |
| `.github/workflows/publish-npm.yml`    | Manual fallback only (`workflow_dispatch`)                |
| `.github/scripts/verify-npm-pack.mjs`  | Tarball allowlist check                                   |

### Agent MUST NOT

- Bump version in `package.json` for shipping without an explicit request to update an existing Release PR.
- Push git tags `v*` expecting CI publish.
- Add npm tokens or Trusted Publisher config inside the repository.
- Squash unrelated commits into a Release PR.

---

## Primary flow (release-please)

Releases are driven by [Conventional Commits](https://www.conventionalcommits.org/) on `main` and the [Release Please](.github/workflows/release-please.yml) workflow.

### GitHub Actions policy (this repo)

The workflow uses the **release-please CLI** via `node .github/scripts/run-release-please.mjs` (devDependency), not `googleapis/release-please-action`, because repository settings only allow Actions from GitHub or `warante`. If Release Please fails with **Startup failure** and a message about an action not being allowed, do not add third-party actions; ensure this CLI workflow is on `main`.

### One-time setup (maintainers)

1. **npm Trusted Publishing (recommended)**  
   On [npmjs.com](https://www.npmjs.com/package/qa-flowkit) → **Settings** → **Trusted Publisher** → **GitHub Actions**:
   - Repository: `warante/QA_FlowKit` (adjust if forked)
   - Workflow filename: `release-please.yml`
   - Environment: leave empty unless you use GitHub Environments

   With Trusted Publishing, publish uses OIDC (`id-token: write`) and does not require `NPM_TOKEN`.

2. **Fallback token (until Trusted Publishing is enabled)**  
   Add repository secret `NPM_TOKEN` (npm automation or granular publish token). The publish job uses it when OIDC is not configured.

3. **Token rotation**  
   If `NPM_TOKEN` was ever exposed or a maintainer leaves, revoke the token on npmjs.com, create a new automation token with publish-only scope, update the GitHub secret, and confirm Trusted Publishing still matches `release-please.yml`. Prefer migrating to Trusted Publishing and removing `NPM_TOKEN` when possible.

4. Ensure **release-please** can open PRs: workflow needs `contents: write` and `pull-requests: write` on `main`.

### Day-to-day development

- [ ] Use Conventional Commit prefixes in **PR titles** (squash-merge): `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, etc.
- [ ] CI is green (includes `npm pack` allowlist check and full validation matrix).
- [ ] No secrets in generated or committed QA artifacts.

### Shipping a release

1. Merge feature/fix PRs to `main` with conventional titles.
2. **Release Please** opens or updates a **Release PR** (`chore: release X.Y.Z`) with bumped `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md`.
3. Review the Release PR (version bump, changelog, dist-tag implications).
4. **Merge the Release PR** (do not squash unrelated commits into it manually).
5. On merge, Release Please creates a **GitHub Release** + git tag and triggers the **publish** job:
   - `npm ci`, lint, format check, `validate:oss-extraction`
   - `npm pack` allowlist verification
   - `npm publish --provenance` with automatic dist-tag (`alpha`, `beta`, or `latest`)
   - Post-publish: `npm view` + install smoke of the published tarball

### Version conventions

| Version pattern | dist-tag | Use when                        |
| --------------- | -------- | ------------------------------- |
| `x.y.z-alpha.N` | `alpha`  | Early preview, API may change   |
| `x.y.z-beta.N`  | `beta`   | Feature-complete, stabilization |
| `x.y.z`         | `latest` | Stable, production-ready        |

Prerelease series is configured in [.release-please-config.json](../../.release-please-config.json) (`prerelease: true`, `prerelease-type: beta`). See [stability-policy.md](stability-policy.md) for the beta exit checklist. To move to stable releases, set `prerelease: false` and remove `prerelease-type` when ready for `1.0.0`.

### After publishing

- [ ] Verify `npm view qa-flowkit version` returns the new version.
- [ ] Confirm the [GitHub Release](https://github.com/warante/QA_FlowKit/releases) notes match the changelog section.
- [ ] For significant releases, update README badges or community notes if the stability label changed.

## Manual fallback

Use only for emergencies or if release-please is blocked:

**Actions → Publish npm (manual fallback) → Run workflow**

Requires `NPM_TOKEN` (or Trusted Publishing on workflow `publish-npm.yml`). The workflow runs the same validations as the automated publish job but uses the current `package.json` version on the checked-out branch (not a release tag).

Do **not** push `v*` tags to trigger publish; tag-based publish was removed to avoid double releases with release-please.

## Local validation before merging a Release PR

```bash
npm ci
npm run lint
npm run format:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

## Installing published versions

```bash
# Latest stable
npm install qa-flowkit

# Current beta line
npm install qa-flowkit@beta

# Legacy alpha line
npm install qa-flowkit@alpha
```
