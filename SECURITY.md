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
