# Contributing

Thanks for contributing to QA FlowKit.

## Principles

- AI coding agents working in this repository must read [AGENTS.md](AGENTS.md) first (validation, QA rules, npm release constraints, documentation map).
- Keep the project repo-first and portable.
- Do not require a hosted backend for the MVP.
- Prefer explicit configuration over hidden behavior.
- All generated test cases must use the configured Gherkin language (`en` or `es`).
- Every destructive or external write operation must require user approval.
- Preserve compatibility with multiple AI coding tools through `AGENTS.md`.

## Agent adapters (single source of truth)

Edit adapter templates **only** under [`.qa-ai/adapters/`](.qa-ai/adapters/). Root copies (`.claude/`, `.opencode/`, `AGENTS.md` from generic, etc.) are generated outputs.

After changing an adapter template:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters claude,opencode --force
```

CI runs [`.github/scripts/verify-adapter-parity.mjs`](.github/scripts/verify-adapter-parity.mjs) so drift between `.qa-ai/adapters/` and root adapter folders fails the PR.

## Development workflow

1. Create an issue describing the problem or improvement.
2. Create a branch from `main`.
3. Add or update documentation when behavior changes.
4. Add validation logic when adding a new rule.
5. Run `npm run validate:oss-extraction` locally (same checks as the GitHub Actions CI workflow).
6. Open a PR with a clear summary and manual validation steps.

## npm releases

The package [`qa-flowkit`](https://www.npmjs.com/package/qa-flowkit) is published to npm via [release-please](.github/workflows/release-please.yml).

1. Merge PRs to `main` using **Conventional Commits** in the PR title (squash-merge), e.g. `feat: add validate-sync-plan to CLI`.
2. Review and merge the **Release PR** opened by release-please (`chore: release X.Y.Z`).
3. Merging the Release PR creates a GitHub Release, tag, and automated npm publish with provenance.

Manual bump/tag is no longer the primary path. See [release checklist](docs/qa-ai/release-checklist.md) and [npm CLI migration](docs/qa-ai/npm-migration-plan.md).

Emergency publish: **Actions → Publish npm (manual fallback)** (requires `NPM_TOKEN` or Trusted Publishing on that workflow).

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/) in PR titles — they drive semver bumps and the changelog via release-please:

- `feat:` new behavior (minor bump before 1.0.0; patch in prerelease series per config)
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` internal restructuring
- `perf:` performance improvement
- `ci:` CI/CD changes
- `chore:` maintenance (usually omitted from changelog)

## Pull request checklist

- [ ] The change is documented.
- [ ] New generated files do not include secrets.
- [ ] Validation scripts still run.
- [ ] The open-source license and attribution are preserved.
- [ ] Any agent-specific instruction has an equivalent generic rule in `AGENTS.md` or `.qa-ai/rules/`.
