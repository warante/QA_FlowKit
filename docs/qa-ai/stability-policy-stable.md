# Stability policy (stable `1.0.0`)

QA FlowKit `1.0.0` and later stable semver releases publish to npm **`latest`**. This document replaces the beta
policy text in [`stability-policy.md`](stability-policy.md) after TASK-086 public entrypoint updates.

## Lifecycle terms

| Term              | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| Stable            | `1.0.0+` on npm `latest`, governed by semver and public contract policy |
| Release candidate | `1.0.0-rc.N` on `rc` — historical soak channel only                     |
| Beta              | `0.5.x-beta.y` on `beta` — supported for migration, not default install |

## Default install channel

```bash
npx qa-flowkit@latest init
npx qa-flowkit@latest update
```

Pin CI to `qa-flowkit@latest` unless testing a legacy migration path.

## Stable contracts

Frozen surfaces are listed in [public-contracts.md](public-contracts.md) and [validator-contracts.md](validator-contracts.md).
Breaking changes require a new major semver and migration guide.

## Deprecation

- Deprecated CLI flags and JSON fields receive at least one minor release with `doctor` warnings before removal.
- Document migrations in `CHANGELOG.md` and [beta-to-1.0-migration.md](beta-to-1.0-migration.md) for cross-major moves.

## Support claims

QA FlowKit provides repository-local workflow controls and validators. It does **not**:

- host or invoke AI models;
- guarantee test pass rates or team productivity;
- replace organizational security review or sandbox policy on agent hosts.

See [threat-model.md](threat-model.md).

## Maintenance releases

Patch and minor stable releases ship through release-please on `main` with conventional PR titles. Do not hand-edit
`package.json` versions for publishing.
