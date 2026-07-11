# Stability policy (release candidate)

QA FlowKit is currently published on the npm **`rc`** channel (`1.0.0-rc.N`). This document defines lifecycle
terminology, support claims, version references and the contracts adopters can rely on before stable `1.0.0`.

## Lifecycle terminology

| Term              | Meaning in QA FlowKit                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Prototype         | Exploratory work with no compatibility commitment; not a public release status                        |
| MVP capability    | A deliberately limited component, such as local proposal-only integrations; not the product lifecycle |
| Beta (previous)   | `0.5.x-beta.y` on npm `beta`; supported for migration only                                            |
| Release candidate | **Current product lifecycle:** `1.0.0-rc.N` on npm `rc` under final validation before stable `1.0.0`  |
| Stable            | `1.0.0` or later on npm `latest`, governed by the stable contract and deprecation policy              |

Use **Release Candidate** (or **RC**) for the current product status. Use **MVP capability** only when describing a
specific intentional limitation; do not describe the whole current product as MVP.

## Version source of truth

| Information                     | Canonical source                                                  |
| ------------------------------- | ----------------------------------------------------------------- |
| Current source version          | `package.json`                                                    |
| Last release-please version     | `.release-please-manifest.json`                                   |
| Published versions and channels | npm package versions/dist-tags                                    |
| Historical release versions     | `CHANGELOG.md` and GitHub Releases                                |
| Evergreen install guidance      | `qa-flowkit@rc` before 1.0; `qa-flowkit` / `@latest` after stable |

Evergreen documentation such as README, SECURITY, ROADMAP and CONTRIBUTING must not copy the current prerelease
number. Exact versions belong only in package metadata, generated release history or explicitly historical migration
records.

## Support claim levels

| Area                          | Claim rule                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Operating systems and Node.js | Supported only when included in the current CI matrix                                     |
| CLI and validators            | Supported when covered by automated integration/smoke tests                               |
| Agent adapters                | State the verification level from `docs/qa-ai/adapter-support.v1.json`                    |
| Presets                       | Supported when a strict target fixture or public reference passes CI                      |
| External tools                | Proposal/read guidance only unless an integration explicitly implements and audits writes |

## Release channel

| Channel             | npm dist-tag | When to use                          |
| ------------------- | ------------ | ------------------------------------ |
| RC (current target) | `rc`         | Current adopters; CI pinned to `@rc` |
| Beta (previous)     | `beta`       | Legacy pins only; migrate to `@rc`   |
| Alpha (legacy)      | `alpha`      | Legacy pins only; migrate to `@rc`   |
| Stable              | `latest`     | Not before `1.0.0`                   |

Install RC:

```bash
npx qa-flowkit@rc
```

## Frozen during RC

- CLI command names: `init`, `update`, `doctor`, `validate-target`, `validate-features`, `help`, …
- Target paths: `.qa-ai/`, `qa-ai.config.yaml`, `.qa-ai/output/`, `features/`
- Rules filenames under `.qa-ai/rules/*.rules.md`
- Required Gherkin tags: `@priority:`, `@type:`, `@manual:`
- Validator scripts and their default non-strict behavior

The complete classification of CLI, configuration, paths, schemas, state and deprecated aliases is maintained in
[Public Contracts](public-contracts.md). Validator strict/non-strict semantics are frozen in
[Validator contracts](validator-contracts.md). CI verifies inventories with `npm run contracts:check` and
`npm run test:cli-contracts`.

## May change in RC (with notice in CHANGELOG)

- New optional config keys in `qa-ai.config.yaml`
- New validators or flags (opt-in first, e.g. `--strict-tags`)
- Agent prompt text and workflow markdown
- Additional CI checks in the source repository

## Breaking changes

Documented in [CHANGELOG.md](../../CHANGELOG.md) with migration steps. RC may include patch-level contract fixes as
`1.0.0-rc.N+1`; prefer deprecation warnings in `doctor` first. A breaking public-contract change resets the RC soak
clock (TASK-081).

## Migration from legacy beta or alpha releases

1. Commit your target repo (`qa-ai.config.yaml`, `.qa-ai/output/`, `features/`).
2. Run `npx qa-flowkit@rc update` (or refresh `.qa-ai/` from an `rc` release tag).
3. Run `npx qa-flowkit doctor --strict` and `npx qa-flowkit validate-target`.
4. Re-sync adapters: `npx qa-flowkit sync-adapters --force` if you use Claude Code or OpenCode.
5. Review new rules in `.qa-ai/rules/README.md`.

See [beta-to-1.0 migration](beta-to-1.0-migration.md) for the oldest supported beta line (`0.5.0-beta.0`).

Optional stricter validation:

```bash
npx qa-flowkit validate-features --strict-tags
```

## RC-to-stable exit checklist

- [ ] CI green on `main` (including `golden-target`, `format:check`, `adapter-parity`)
- [ ] npm Trusted Publishing configured for `release-please.yml`
- [x] Beta release line published through release-please
- [x] RC release line active on npm `rc`
- [x] In-repo fixture [`test/fixtures/golden-target/`](../../test/fixtures/golden-target/) passes `validate-target` without allow flags
- [x] Migration guidance published and linked from README
- [x] README badge and dist-tag point to **RC**
- [ ] RC soak and stable gates in [`tasks/README.md`](../../tasks/README.md) complete

Promote to `latest` only through the reviewed release-please stable transition described in the 1.0 plan.
