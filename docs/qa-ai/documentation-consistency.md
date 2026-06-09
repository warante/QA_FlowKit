# Documentation consistency checks

The source repository runs:

```bash
npm run docs:check
npm run test:doc-consistency
```

`docs:check` verifies:

- evergreen public docs do not copy an exact prerelease version;
- README and SECURITY lifecycle claims use the current Beta terminology;
- the npm audit threshold documented in `SECURITY.md` matches CI;
- maintainer validation commands match the canonical package scripts;
- local Markdown links in root docs, `docs/`, `tasks/`, `.github/` and canonical `.qa-ai` agent/rule/workflow sources
  resolve without network access.

Adapter templates are excluded from link checks because their links target the generated location in a consumer
repository. Generated root adapter copies are checked separately by adapter parity and smoke tests.

## Version references

Exact current versions belong in `package.json`, `.release-please-manifest.json` and generated release history.
Evergreen docs should use npm channels such as `@beta` or `@latest`.

Historical version references remain valid in `CHANGELOG.md` and explicit migration history. If a new historical file
needs an exception, keep it outside the evergreen file list in
`.github/scripts/lib/documentation-consistency.mjs`; do not weaken the prerelease pattern globally.

## Resolving failures

- **Stale version:** replace the exact prerelease with a lifecycle name or npm dist-tag.
- **Audit mismatch:** update the CI command and `SECURITY.md` together.
- **Missing validation command:** update `AGENTS.md`, the release checklist and `package.json` consistently.
- **Broken local link:** resolve it relative to the Markdown file containing the link.
- **Lifecycle mismatch:** use Beta for the product and MVP only for a specifically scoped capability.

The unit tests use isolated fixtures and must cover each rejected failure mode before the checker is expanded.
