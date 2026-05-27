# npm CLI Migration

QA FlowKit now ships an npm CLI while preserving the portable `.qa-ai/` framework contract.

## Primary flow

```bash
npx qa-flowkit init
```

`init` copies the packaged `.qa-ai/` folder into the target repository, runs the existing init logic, generates the default config and folders, syncs the default OpenCode adapter, and runs `doctor` in warn-only mode.

If `.qa-ai/` already exists, `init` stops safely and asks the user to run:

```bash
npx qa-flowkit update
```

## CLI commands

- `qa-flowkit init`
- `qa-flowkit update`
- `qa-flowkit doctor`
- `qa-flowkit validate-target`
- `qa-flowkit validate-features`
- `qa-flowkit sync-adapters`
- `qa-flowkit help`
- `qa-flowkit clean`

All commands except `init` require `.qa-ai/` in the target repository and delegate to the existing `.qa-ai/scripts/*.mjs` implementation.

## Compatibility contract

- `.qa-ai/` remains the portable framework folder.
- `qa-ai.config.yaml` remains the config file.
- `qa-ai-output/`, `features/` and `tests/` remain stable generated/output paths.
- Existing adapters remain valid.
- `update` replaces only `.qa-ai/`, preserving `.qa-ai/state/` and `.qa-ai/config-profiles/`.
- The manual folder-copy flow remains supported when npm is not available.

## Release path

First npm release:

```bash
npm view qa-flowkit version
npm publish --tag alpha
```

If `npm view qa-flowkit version` returns an existing package, stop and choose a scoped fallback before publishing.
