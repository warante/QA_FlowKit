# Cleanup Rules

**Enforced by:** clean.mjs (dry-run default)

Apply when using `node .qa-ai/scripts/clean.mjs` or `npx qa-flowkit clean` in a target repository.

## Safety defaults

- Default mode is **dry-run**: show the plan; delete nothing without `--force`.
- Cleanup uses `.qa-ai/state/init-manifest.json`; do not delete by path pattern alone.
- Skip files that changed since the manifest recorded them unless the user passes `--include-modified`.

## Scopes

- Use documented flags (`--generated`, `--adapters`, etc.) as described in `docs/qa-ai/cleanup.md` when present in the repo.
- Do not remove user-edited `.qa-ai/output/` analysis, custom `AGENTS.md` content outside the manifest, or unrelated project files.

## Agent behavior

- Present the dry-run output and ask for explicit approval before recommending `--force`.
- Never run destructive cleanup on paths outside the manifest without user confirmation.
