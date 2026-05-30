# Stability policy (beta)

QA FlowKit is moving from `0.4.0-alpha.*` to **`0.5.0-beta.*`** on npm. This document defines what early adopters can rely on during beta and how to migrate.

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

## May change in beta (with notice in CHANGELOG)

- New optional config keys in `qa-ai.config.yaml`
- New validators or flags (opt-in first, e.g. `--strict-tags`)
- Agent prompt text and workflow markdown
- Additional CI checks in the source repository

## Breaking changes

Documented in [CHANGELOG.md](../../CHANGELOG.md) with migration steps. Beta may include minor breaking changes if they unblock `1.0.0`; prefer deprecation warnings in `doctor` first.

## Migration from `0.4.0-alpha.*`

1. Commit your target repo (`qa-ai.config.yaml`, `qa-ai-output/`, `features/`).
2. Run `npx qa-flowkit@beta update` (or refresh `.qa-ai/` from a beta release tag).
3. Run `npx qa-flowkit doctor --strict` and `npx qa-flowkit validate-target`.
4. Re-sync adapters: `npx qa-flowkit sync-adapters --force` if you use Claude Code or OpenCode.
5. Review new rules in `.qa-ai/rules/README.md`.

Optional stricter validation:

```bash
npx qa-flowkit validate-features --strict-tags
```

## Beta exit checklist (maintainers)

- [ ] CI green on `main` (including `golden-target`, `format:check`, `adapter-parity`)
- [ ] npm Trusted Publishing configured for `release-please.yml`
- [ ] First Release PR for `0.5.0-beta.0` merged
- [ ] In-repo fixture [`test/fixtures/golden-target/`](../../test/fixtures/golden-target/) passes `validate-target` without allow flags
- [ ] Migration section above published and linked from README
- [ ] README badge and dist-tag point to **Beta** (not Early Product / alpha)

After checklist: set `prerelease-type: beta` in `.release-please-config.json` and publish the beta series. Promote to `latest` only at `1.0.0`.
