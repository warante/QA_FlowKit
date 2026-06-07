# Stability policy (beta)

QA FlowKit is currently published on the npm **`beta`** channel. This document defines lifecycle terminology, support
claims, version references and the contracts early adopters can rely on before stable `1.0.0`.

## Lifecycle terminology

| Term              | Meaning in QA FlowKit                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Prototype         | Exploratory work with no compatibility commitment; not a public release status                        |
| MVP capability    | A deliberately limited component, such as local proposal-only integrations; not the product lifecycle |
| Beta              | Current product lifecycle: usable and CI-backed, with documented migration for contract changes       |
| Release candidate | A `1.0.0-rc` package under final compatibility, security and release validation                       |
| Stable            | `1.0.0` or later on npm `latest`, governed by the stable contract and deprecation policy              |

Use **Beta** for the current product status. Use **MVP capability** only when describing a specific intentional
limitation; do not describe the whole current product as MVP.

## Version source of truth

| Information                     | Canonical source                                                    |
| ------------------------------- | ------------------------------------------------------------------- |
| Current source version          | `package.json`                                                      |
| Last release-please version     | `.release-please-manifest.json`                                     |
| Published versions and channels | npm package versions/dist-tags                                      |
| Historical release versions     | `CHANGELOG.md` and GitHub Releases                                  |
| Evergreen install guidance      | `qa-flowkit@beta` before 1.0; `qa-flowkit` / `@latest` after stable |

Evergreen documentation such as README, SECURITY, ROADMAP and CONTRIBUTING must not copy the current prerelease
number. Exact versions belong only in package metadata, generated release history or explicitly historical migration
records.

## Support claim levels

| Area                          | Claim rule                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Operating systems and Node.js | Supported only when included in the current CI matrix                                     |
| CLI and validators            | Supported when covered by automated integration/smoke tests                               |
| Agent adapters                | State the verification level: template, smoke or real-host E2E                            |
| Presets                       | Supported when a strict target fixture or public reference passes CI                      |
| External tools                | Proposal/read guidance only unless an integration explicitly implements and audits writes |

## Release channel

| Channel               | npm dist-tag | When to use                          |
| --------------------- | ------------ | ------------------------------------ |
| Beta (current target) | `beta`       | Early adopters; CI pinned to `@beta` |
| Alpha (previous)      | `alpha`      | Legacy pins only; migrate to beta    |
| Stable                | `latest`     | Not before `1.0.0`                   |

Install beta:

```bash
npx qa-flowkit@beta init
```

## Stable during beta

- CLI command names: `init`, `update`, `doctor`, `validate-target`, `validate-features`, `help`, …
- Target paths: `.qa-ai/`, `qa-ai.config.yaml`, `qa-ai-output/`, `features/`
- Rules filenames under `.qa-ai/rules/*.rules.md`
- Required Gherkin tags: `@priority:`, `@type:`, `@manual:`
- Validator scripts and their default non-strict behavior

The complete classification of CLI, configuration, paths, schemas, state and deprecated aliases is maintained in
[Public Contracts](public-contracts.md). CI verifies its machine-readable inventory with `npm run contracts:check`.

## May change in beta (with notice in CHANGELOG)

- New optional config keys in `qa-ai.config.yaml`
- New validators or flags (opt-in first, e.g. `--strict-tags`)
- Agent prompt text and workflow markdown
- Additional CI checks in the source repository

## Breaking changes

Documented in [CHANGELOG.md](../../CHANGELOG.md) with migration steps. Beta may include minor breaking changes if they unblock `1.0.0`; prefer deprecation warnings in `doctor` first.

## Migration from legacy alpha releases

1. Commit your target repo (`qa-ai.config.yaml`, `qa-ai-output/`, `features/`).
2. Run `npx qa-flowkit@beta update` (or refresh `.qa-ai/` from a beta release tag).
3. Run `npx qa-flowkit doctor --strict` and `npx qa-flowkit validate-target`.
4. Re-sync adapters: `npx qa-flowkit sync-adapters --force` if you use Claude Code or OpenCode.
5. Review new rules in `.qa-ai/rules/README.md`.

Optional stricter validation:

```bash
npx qa-flowkit validate-features --strict-tags
```

## Beta-to-1.0 exit checklist

- [ ] CI green on `main` (including `golden-target`, `format:check`, `adapter-parity`)
- [ ] npm Trusted Publishing configured for `release-please.yml`
- [x] Beta release line published through release-please
- [x] In-repo fixture [`test/fixtures/golden-target/`](../../test/fixtures/golden-target/) passes `validate-target` without allow flags
- [x] Migration guidance published and linked from README
- [x] README badge and dist-tag point to **Beta**
- [ ] Product baseline through release-candidate gates in [`tasks/README.md`](../../tasks/README.md) complete

Promote to `latest` only through the reviewed release-please stable transition described in the 1.0 plan.
