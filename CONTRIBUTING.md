# Contributing

Thanks for contributing to QA FlowKit.

## Principles

- AI coding agents working in this repository must read [AGENTS.md](AGENTS.md) first (validation, QA rules, npm release constraints, documentation map).
- Keep the project repo-first and portable.
- Do not require a hosted backend for the current repository-first product.
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
5. Follow the lifecycle and version-reference rules in [stability-policy.md](docs/qa-ai/stability-policy.md).
6. Run `npm run docs:check` and `npm run validate:oss-extraction` locally.
7. Open a PR with a clear summary and manual validation steps.

Changes under `examples/`, presets or target validators must also keep
[`examples/compatibility.json`](examples/compatibility.json) current. Run:

```bash
npm run test:example-compatibility
```

Published-channel regressions are owned and triaged according to
[example maintenance](docs/qa-ai/example-repos.md).

The documentation checker is described in
[documentation-consistency.md](docs/qa-ai/documentation-consistency.md). Exact current prerelease versions belong in
package/release metadata, not evergreen README, SECURITY, ROADMAP or CONTRIBUTING text.

## Coverage

Validator and harness library coverage is measured with `c8` across:

- `.qa-ai/scripts/test-validators.mjs`
- `.qa-ai/scripts/test-harness.mjs`
- `.qa-ai/scripts/test-cli-integration.mjs`

Run the merged report locally with:

```bash
npm run coverage
```

Run the no-regression gate with:

```bash
npm run coverage:check
```

The initial baseline is 78.31% lines and 70.33% branches for `.qa-ai/scripts/lib/**/*.mjs`; the enforced thresholds
are rounded down to 78% lines and 70% branches. PRs that reduce coverage below those thresholds should add focused
tests or intentionally raise the quality bar when coverage improves. CI runs `coverage:check` on Ubuntu with Node.js 20.

## Mutation testing

To ensure unit test quality and avoid assertion gaps in our core validators under `.qa-ai/scripts/lib/`, we use StrykerJS.

Run the mutation test suite locally with:

```bash
npm run mutation
```

Note that mutation testing is advisory, scoped to the pure validator library files, and is executed weekly via a non-blocking CI job (`.github/workflows/mutation.yml`). Developers are encouraged to check mutation results to identify untested edge cases.

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
