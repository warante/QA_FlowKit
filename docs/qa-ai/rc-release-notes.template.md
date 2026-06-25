# Release notes — qa-flowkit `1.0.0-rc.N`

> Copy this template into the GitHub Release body when publishing `1.0.0-rc.N`.
> Replace placeholders; keep links relative to `main` where possible.

## Summary

- **Channel:** `npm install qa-flowkit@rc` / `npx qa-flowkit@rc`
- **Version:** `1.0.0-rc.N`
- **Prior channel:** `beta` (`0.5.x-beta.y`)
- **Stability:** Release candidate — not stable `1.0.0` yet

## Install

```bash
npx qa-flowkit@rc init
npx qa-flowkit@rc doctor --strict
```

## Upgrade from beta

```bash
npx qa-flowkit@rc update --dry-run
npx qa-flowkit@rc update
```

See [beta-to-1.0-migration.md](beta-to-1.0-migration.md).

## Highlights

<!-- bullet list of user-visible changes from CHANGELOG.md for this RC -->

- …

## Known limitations

See [rc-known-limitations.md](rc-known-limitations.md).

## Verification

Post-publish checks (maintainers):

```bash
node .github/scripts/run-rc-post-publish-validation.mjs --version 1.0.0-rc.N
```

Scheduled example compatibility: run **Example compatibility** workflow with channel `rc`.

## Feedback

Open an issue with the [RC feedback template](../../.github/ISSUE_TEMPLATE/rc-feedback.yml).

## Full changelog

See [CHANGELOG.md](../../CHANGELOG.md).
