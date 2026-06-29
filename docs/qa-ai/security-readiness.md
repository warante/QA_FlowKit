# Security Readiness

This RC summary records the current security and dependency review for QA FlowKit `1.0.0-rc.3`. It avoids
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
- [`.npmrc`](../../.npmrc) enforces `min-release-age=2` so npm refuses versions published less than two days ago.
  Requires npm CLI `>= 11.10.0`; CI uses [`.github/actions/setup-node-with-npm-policy`](../../.github/actions/setup-node-with-npm-policy/action.yml)
  before `npm ci`.
- Dependabot is configured weekly for npm and GitHub Actions in `.github/dependabot.yml`, with a two-day
  `cooldown.default-days` aligned to the npm release-age gate.

Evidence:

- `npm ls --depth=0`
- `npm audit --audit-level=low` returned `found 0 vulnerabilities` on 2026-06-25.
- CI runs dependency policy checks and `npm audit --audit-level=low` in `.github/workflows/ci.yml`.

## Dependabot Configuration

Repository and GitHub settings (confirmed 2026-06-26):

| Setting                     | Status                                  |
| --------------------------- | --------------------------------------- |
| Dependency graph            | enabled                                 |
| Dependabot alerts           | enabled (1 rule active)                 |
| Dependabot security updates | enabled                                 |
| Dependabot malware alerts   | enabled                                 |
| Grouped security updates    | enabled                                 |
| Dependabot version updates  | configured via `.github/dependabot.yml` |

Version-update coverage in `.github/dependabot.yml`:

- `github-actions` at repository root (weekly, limit 5 open PRs).
- `npm` at repository root (weekly, limit 5 open PRs, `cooldown.default-days: 2`).
- `npm` at `examples/playwright-full` (weekly, limit 3 open PRs, `cooldown.default-days: 2`).

Operational follow-up (not configuration): review or explicitly defer open Dependabot PRs before RC; triage any new
high or critical alerts in GitHub Security.

Evidence:

- `.github/dependabot.yml`
- `gh api repos/warante/QA_FlowKit/dependabot/alerts?state=open` returned `0` open alerts on 2026-06-26.

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
| npm Trusted Publishing requires human maintainer verification before RC.                                              | release engineer              | 2026-06-25  | accepted with pre-RC checklist |
| GitHub-owned Actions are major-version pinned, not SHA pinned.                                                        | release engineer              | 2026-06-25  | accepted                       |
| CodeQL currently focuses on `.qa-ai/scripts`; docs/templates are covered by repository validation rather than CodeQL. | security engineer             | 2026-06-25  | accepted                       |

## Pre-RC Human Checks

Before publishing an RC, a maintainer should confirm:

- GitHub Private Vulnerability Reporting is enabled (confirmed 2026-06-26:
  `gh api repos/warante/QA_FlowKit/private-vulnerability-reporting` → `{"enabled":true}`).
- GitHub branch protection requires `Validate starter`, `Coverage` and `Analyze JavaScript` (confirmed 2026-06-26:
  ruleset **Protect release branches** active on `main`; required status checks listed above).
- Dependabot configuration is complete (confirmed 2026-06-26; see [Dependabot Configuration](#dependabot-configuration)).
- GitHub Security has no untriaged high or critical alerts (confirmed 2026-06-26: Security overview reviewed;
  no open high/critical Dependabot, CodeQL or advisory items requiring triage).
- Dependabot PRs are reviewed or explicitly deferred.
- npm Trusted Publishing is configured for `release-please.yml` (confirmed 2026-06-26: npmjs.com package `qa-flowkit` →
  Trusted Publisher → `warante/QA_FlowKit` / `release-please.yml`; publish verified on `1.0.0-rc.3` via Release
  Please workflow with provenance).
- Release Please can open and update Release PRs on `main` (confirmed 2026-06-26: workflow permissions allow PR creation;
  Release Please path verified on `1.0.0-rc.3`).
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
