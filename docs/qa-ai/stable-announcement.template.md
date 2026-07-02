# QA FlowKit `1.0.0` is stable on npm

> Copy for GitHub Release discussion, maintainer blog post or pinned issue.  
> Do not add productivity or security guarantees beyond documented scope.

## Summary

- **Package:** `qa-flowkit@latest` (`1.0.0`)
- **Install:** `npx qa-flowkit@latest`
- **Prior channels:** `beta`, `rc` (still installable for migration testing)
- **Contracts:** frozen public CLI and validator contracts per [stability-policy-stable.md](stability-policy-stable.md)

## Install

```bash
npx qa-flowkit@latest
npx qa-flowkit doctor --strict
```

## Upgrade

From beta or RC:

```bash
npx qa-flowkit@latest update --dry-run
npx qa-flowkit@latest update
```

See [beta-to-1.0-migration.md](beta-to-1.0-migration.md).

## Examples

- [examples/README.md](../../examples/README.md) — manual, Playwright, Karate and mobile paths
- Deterministic RF-101 quick path: [getting-started.md](getting-started.md)

## Demo

```bash
npx qa-flowkit@latest
node .qa-ai/scripts/init.mjs --preset manual-only --adapters generic
npx qa-flowkit@latest run start --rf RF-101
npx qa-flowkit@latest validate-target
```

## Known limitations

- Accepted risks from RC soak and stable approval remain documented.
- QA FlowKit is not a sandbox for hostile agents or unrestricted shell access.
- See [public-contracts.md](public-contracts.md) and [threat-model.md](threat-model.md).

## Feedback

Open structured feedback with the [stable feedback issue template](../../.github/ISSUE_TEMPLATE/stable-feedback.yml).

## Full changelog

[CHANGELOG.md](../../CHANGELOG.md)
