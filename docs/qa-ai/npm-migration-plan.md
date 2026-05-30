# npm CLI Migration

QA FlowKit now ships an npm CLI while preserving the portable `.qa-ai/` framework contract.

## Primary flow

```bash
npx qa-flowkit init
```

`init` copies the packaged `.qa-ai/` folder into the target repository, runs the existing init logic, generates the default config and folders, syncs the default OpenCode adapter, and runs `doctor` in warn-only mode.

If `.qa-ai/` already exists, `init` stops safely and asks the user to run:

```bash
npx qa-flowkit update
```

## CLI commands

- `qa-flowkit init`
- `qa-flowkit update`
- `qa-flowkit doctor`
- `qa-flowkit validate-target`
- `qa-flowkit validate-features`
- `qa-flowkit sync-adapters`
- `qa-flowkit help`
- `qa-flowkit clean`

All commands except `init` require `.qa-ai/` in the target repository and delegate to the existing `.qa-ai/scripts/*.mjs` implementation.

## Compatibility contract

- `.qa-ai/` remains the portable framework folder.
- `qa-ai.config.yaml` remains the config file.
- `qa-ai-output/`, `features/` and `tests/` remain stable generated/output paths.
- Existing adapters remain valid.
- `update` replaces only `.qa-ai/`, preserving `.qa-ai/state/` and `.qa-ai/config-profiles/`.
- The manual folder-copy flow remains supported when npm is not available.

## Release path

### Automated publish (release-please)

The first release (`0.4.0-alpha.0`) was published manually. Subsequent releases use **release-please** on `main`.

**Workflow:** [`.github/workflows/release-please.yml`](../../.github/workflows/release-please.yml)

1. Merge PRs to `main` with [Conventional Commits](https://www.conventionalcommits.org/) in PR titles (`feat:`, `fix:`, `docs:`, …).
2. Release Please opens or updates a **Release PR** that bumps `package.json`, `.release-please-manifest.json`, and `CHANGELOG.md`.
3. Merge the Release PR. Release Please creates a GitHub Release + tag and runs the **publish** job:
   - `npm ci`, lint, format check, `validate:oss-extraction`
   - npm pack allowlist check (`.github/scripts/verify-npm-pack.mjs`)
   - `npm publish --provenance --access public` with automatic dist-tag (`alpha`, `beta`, or `latest`)
   - Post-publish verification (`npm view` + install smoke)

**Configuration:**

- [`.release-please-config.json`](../../.release-please-config.json) — versioning, prerelease `alpha`, changelog sections
- [`.release-please-manifest.json`](../../.release-please-manifest.json) — last released version per package root

See [release-checklist.md](release-checklist.md) for maintainer setup and post-release checks.

### npm Trusted Publishing

Preferred auth for CI publish is **Trusted Publishing** (OIDC) on npmjs.com:

- Package: `qa-flowkit`
- Repository: `warante/QA_FlowKit`
- Workflow: `release-please.yml`

Requires npm CLI ≥ 11.5.1 (workflow upgrades npm globally before publish). Provenance is signed via OIDC when Trusted Publishing is enabled.

Until Trusted Publishing is configured, set repository secret **`NPM_TOKEN`** (automation or granular publish token). The publish job passes it as `NODE_AUTH_TOKEN` fallback.

### Manual fallback

**Actions → Publish npm (manual fallback) → Run workflow**

Use only when release-please is unavailable. Same validations as automated publish; uses `package.json` on the selected branch. Optional `dist_tag` input overrides automatic dist-tag resolution.

Do not push `v*` tags expecting publish — tag-triggered publish was removed to prevent duplicate releases.

### Local validation

```bash
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

### First manual publish (historical)

```bash
npm view qa-flowkit version
npm publish --tag alpha
```

If `npm view qa-flowkit version` returns an existing package, stop and choose a scoped fallback before publishing.
