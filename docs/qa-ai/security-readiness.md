# Security Readiness

This pre-RC summary records the current security and dependency review for QA FlowKit `0.5.8-beta.0`. It avoids
exploit-level detail and points maintainers to the checks that must stay green before an RC or stable release.

Review date: 2026-06-25

Owner: security engineer

## Dependency Review

Runtime dependency policy:

- The published CLI has no production `dependencies`.
- Framework scripts remain dependency-light and use native Node.js APIs where practical.
- Current top-level dev dependencies are `@eslint/js`, `@stryker-mutator/core`, `c8`, `eslint`, `prettier` and
  `release-please`.
- `package.json` keeps the `qs` override at `6.15.2`.
- Dependabot is configured weekly for npm and GitHub Actions in `.github/dependabot.yml`.

Evidence:

- `npm ls --depth=0`
- `npm audit --audit-level=low` returned `found 0 vulnerabilities` on 2026-06-25.
- CI runs dependency policy checks and `npm audit --audit-level=low` in `.github/workflows/ci.yml`.

## Static Analysis And CI Gates

Required release-bound contexts are documented in [`ci-observability.md`](ci-observability.md):

- `Validate starter`
- `Coverage`
- `Analyze JavaScript`

CodeQL:

- Workflow: `.github/workflows/codeql.yml`
- Job: `Analyze JavaScript`
- Config: `.github/codeql/codeql-config.yml`
- Current configured path scope: `.qa-ai/scripts`

Evidence:

- `npm run test:required-checks`
- `npm run validate:oss-extraction`

## Package And Provenance Review

Package controls:

- `node .github/scripts/verify-npm-pack.mjs` checks the npm tarball allowlist.
- Release workflows run lint, format, full validation and pack verification before publish.
- `release-please.yml` is the primary release path.
- Publish commands use `npm publish --provenance --access public`.
- `publish-npm.yml` remains a human-triggered manual fallback.

Accepted limitation:

- npm Trusted Publishing is an npmjs.com repository setting and must be verified by a human maintainer before RC.
- `NPM_TOKEN` is only a GitHub secret fallback and must never be committed to the repository.

## Action And Workflow Review

The repository uses GitHub-owned Actions in the primary CI and release workflows:

- `actions/checkout`
- `actions/setup-node`
- `actions/setup-java`
- `actions/upload-artifact`
- `github/codeql-action/init`
- `github/codeql-action/analyze`

Accepted limitation:

- Actions are version-pinned to major versions rather than immutable SHAs. This is accepted for the RC path because the
  repo restricts the action set to GitHub-owned actions and keeps Dependabot updates active. Revisit SHA pinning if the
  project adopts a stricter supply-chain policy.

## Residual Risks Accepted For RC

| Risk                                                                                                                  | Owner                         | Review date | Status                         |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------- | ------------------------------ |
| QA FlowKit is not a sandbox for a hostile agent or unrestricted host shell.                                           | security engineer             | 2026-06-25  | accepted                       |
| Hookless hosts rely on documented validation discipline rather than automatic stop hooks.                             | developer experience engineer | 2026-06-25  | accepted                       |
| External write enforcement depends on users and host tooling honoring approval gates.                                 | engineering lead              | 2026-06-25  | accepted                       |
| npm Trusted Publishing and GitHub security settings require human maintainer verification.                            | release engineer              | 2026-06-25  | accepted with pre-RC checklist |
| GitHub-owned Actions are major-version pinned, not SHA pinned.                                                        | release engineer              | 2026-06-25  | accepted                       |
| CodeQL currently focuses on `.qa-ai/scripts`; docs/templates are covered by repository validation rather than CodeQL. | security engineer             | 2026-06-25  | accepted                       |

## Pre-RC Human Checks

Before publishing an RC, a maintainer should confirm:

- GitHub branch protection requires `Validate starter`, `Coverage` and `Analyze JavaScript`.
- GitHub Security has no untriaged high or critical alerts.
- Dependabot PRs are reviewed or explicitly deferred.
- npm Trusted Publishing is configured for `release-please.yml`, or `NPM_TOKEN` fallback is intentionally retained as a
  temporary secret.
- The Release PR validation is green on the candidate commit.

## Local Evidence Captured

Commands passed on 2026-06-25:

```bash
npm audit --audit-level=low
npm ls --depth=0
npm run test:required-checks
npm run test:adapter-support
npm run test:threat-model
npm run test:e2e-adversarial
node .github/scripts/verify-npm-pack.mjs
```
