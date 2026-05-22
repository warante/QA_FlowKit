---
description: Guided manifest-based QA AI cleanup
argument-hint: [optional clean flags]
---

Preview or execute cleanup for generated QA AI Starter artifacts.

If `$ARGUMENTS` is empty, run the safe dry-run first:

```bash
node .qa-ai/scripts/clean.mjs
```

Summarize the cleanup plan, then ask the user:

1. Which scope should be cleaned?
   - `generated`: generated config, QA docs and empty generated folders.
   - `adapters`: generated agent adapter files.
   - `empty-dirs`: tracked empty directories.
   - `all`: all tracked entries.
2. Should cleanup be executed with `--force`?
   - Recommend `no` until the dry-run is reviewed.
3. Should modified tracked files be deleted?
   - Recommend `no`; only use `--include-modified` if the user explicitly wants to discard edits.

If the user approves execution, build and run:

```bash
node .qa-ai/scripts/clean.mjs --<scope> --force
```

Only add `--include-modified` when explicitly approved.

If `$ARGUMENTS` is not empty, treat it as advanced mode and run:

```bash
node .qa-ai/scripts/clean.mjs $ARGUMENTS
```

Do not delete anything outside the manifest-based clean script.
