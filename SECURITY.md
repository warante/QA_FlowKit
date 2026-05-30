# Security Policy

## Supported versions

The project is currently in MVP stage. Security fixes target the latest version of `main`.

## Reporting a vulnerability

Do not open public issues for secrets, credential leaks or high-impact security problems. Contact the maintainers privately.

## Security principles

- Never commit credentials, API tokens or personal data.
- `.qa-ai/` must not store secrets.
- Generated `.mcp.json` files must use environment variables.
- External writes to Jira, Confluence, TestRail or GitHub must require explicit user approval.
- Deletion operations should be disabled by default.
- Scripts must prefer dry-run or proposal-first behavior.

## Automated checks (source repository)

- Pull requests run `npm audit --audit-level=high` in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
- `validate-target` with `doctor --strict` scans `qa-ai-output/` and `features/` for secret-like values (see `.qa-ai/scripts/lib/secret-patterns.mjs`).
- The golden target fixture in `test/fixtures/golden-target/` is validated in CI without permissive allow flags.

## Consumer repositories

Teams using QA FlowKit in their own repos should run `npx qa-flowkit doctor --strict` and `validate-target` in CI, keep secrets in environment variables, and pin the npm dist-tag (`beta` or `latest`) intentionally. Dependency updates in the target repo remain the consumer’s responsibility.
