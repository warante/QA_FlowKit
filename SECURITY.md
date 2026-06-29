# Security Policy

## Supported versions

The project is currently in Release Candidate (RC). Security fixes target the latest published `rc` release and the latest version of
`main`. Older prereleases receive fixes only when maintainers determine that a backport is practical.

## Reporting a vulnerability

Do not open a public issue or discussion for a suspected vulnerability.

Use [GitHub Private Vulnerability Reporting](https://github.com/warante/QA_FlowKit/security/advisories/new) to send the
report privately. Include affected versions, reproduction steps, impact and any suggested mitigation, but do not
include real credentials or personal data.

If the private reporting form is unavailable, contact the
[repository owner](https://github.com/warante) through a private contact method listed on their GitHub profile before
sharing technical details. The project does not currently promise a response SLA; maintainers will acknowledge and
coordinate disclosure as soon as practical.

## Security principles

- Never commit credentials, API tokens or personal data.
- `.qa-ai/` must not store secrets.
- Generated `.mcp.json` files must use environment variables.
- Current QA FlowKit scripts do not perform external writes to Jira, Confluence, TestRail or GitHub.
- Config-declared custom validators are experimental and must be repo-local Node.js scripts. `doctor` rejects absolute
  paths, path traversal, unknown workflow phases and built-in validator id shadowing, then runs `--self-test --json`.
  Validators run without additional environment variables from FlowKit; do not use them to read credentials or call
  external services.
- Future external-write integrations must require explicit user approval and auditable scopes.
- Governed test-management sync keeps the external-write boundary outside FlowKit scripts: `sync-apply` may write only
  through user-approved host MCP/tooling after the `external-write:test-management` gate is recorded, with rollback and
  apply-log artifacts kept in the repository for audit. FlowKit validators inspect those artifacts; they do not hold
  credentials or perform the remote writes themselves.
- Deletion operations should be disabled by default.
- Scripts must prefer dry-run or proposal-first behavior.

The current asset, trust-boundary and residual-risk inventory is maintained in the
[QA FlowKit threat model](docs/qa-ai/threat-model.md).

## Automated checks (source repository)

- Pull requests run `npm audit --audit-level=low` in [`.github/workflows/ci.yml`](.github/workflows/ci.yml), so any
  reported low, moderate, high or critical vulnerability fails the audit step.
- [`.npmrc`](.npmrc) sets `min-release-age=2`, so npm refuses package versions published less than two days ago.
  CI upgrades to npm CLI `>= 11.10.0` before `npm ci` so the policy is enforced (see
  [security readiness](docs/qa-ai/security-readiness.md)).
- `validate-target` with `doctor --strict` scans `qa-ai-output/` and `features/` for secret-like values (see `.qa-ai/scripts/lib/secret-patterns.mjs`).
- The golden target fixture in `test/fixtures/golden-target/` is validated in CI without permissive allow flags.

## Consumer repositories

Teams using QA FlowKit in their own repos should run `npx qa-flowkit doctor --strict` and `validate-target` in CI, keep secrets in environment variables, and pin the npm dist-tag (`beta` or `latest`) intentionally. Dependency updates in the target repo remain the consumer’s responsibility.
