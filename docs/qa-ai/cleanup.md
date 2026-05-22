# Cleanup

QA AI Starter includes a conservative cleanup command for generated files:

```bash
node .qa-ai/scripts/clean.mjs
```

The command is designed for target repositories after `.qa-ai/` has been copied and `init.mjs` has run.

## Why cleanup is manifest-based

Generated project files can become real user work quickly. For example, `docs/qa/test-design-proposal.md` may start as a template and later contain important analysis.

For that reason, cleanup does not delete by path pattern alone. It reads:

```text
.qa-ai/state/init-manifest.json
```

The manifest records what the framework actually created, along with SHA-256 hashes for files. If a tracked file has changed since it was created, cleanup skips it by default.

## Dry-run default

Running clean without flags shows the plan and deletes nothing:

```bash
node .qa-ai/scripts/clean.mjs
```

The output uses actions such as:

- `WOULD DELETE FILE`: unchanged tracked file would be removed with `--force`.
- `WOULD REMOVE DIR`: tracked empty directory would be removed with `--force`.
- `SKIP`: entry is protected, modified, unsafe or non-empty.
- `MISSING`: entry no longer exists and would be removed from the manifest when executing.

## Cleanup scopes

Generated config, QA docs and generated empty folders:

```bash
node .qa-ai/scripts/clean.mjs --generated
node .qa-ai/scripts/clean.mjs --generated --force
```

Agent adapters:

```bash
node .qa-ai/scripts/clean.mjs --adapters
node .qa-ai/scripts/clean.mjs --adapters --empty-dirs --force
```

Tracked empty directories:

```bash
node .qa-ai/scripts/clean.mjs --empty-dirs
node .qa-ai/scripts/clean.mjs --empty-dirs --force
```

Everything tracked:

```bash
node .qa-ai/scripts/clean.mjs --all
node .qa-ai/scripts/clean.mjs --all --force
```

When no scope flag is passed, `--all` is assumed for the dry-run preview.

## Modified files

Changed tracked files are skipped by default:

```text
[SKIP] docs/qa/test-design-proposal.md (modified since init)
```

To delete modified tracked files, the user must be explicit:

```bash
node .qa-ai/scripts/clean.mjs --generated --force --include-modified
```

Use this only when the generated content is intentionally being discarded.

## Manifest pruning

After all tracked entries are removed, the manifest can be removed too:

```bash
node .qa-ai/scripts/clean.mjs --all --force --prune-state
```

Without `--prune-state`, the manifest remains and records any entries that were skipped.

## Non-goals

The cleanup command does not:

- Remove the copied `.qa-ai/` framework folder.
- Delete untracked user files.
- Delete non-empty directories.
- Revert Git changes.
- Clean configured external tool data.
