# Migration Plan to npm CLI

The folder-based MVP should be designed so it can later become:

```bash
npx qa-ai-workflow init
```

## Migration strategy

Current:

```bash
node .qa-ai/scripts/init.mjs
```

Future:

```bash
npx qa-ai-workflow init
```

The npm CLI should reuse the same logic:

- Copy `.qa-ai/` to target repo.
- Run init logic.
- Generate config.
- Generate adapters.
- Run doctor.

## Future package structure

```text
qa-ai-workflow/
  package.json
  bin/qa-ai-workflow.js
  src/commands/init.js
  src/commands/doctor.js
  src/commands/update.js
  templates/.qa-ai/
```

## Required future commands

- `qa-ai-workflow init`
- `qa-ai-workflow doctor`
- `qa-ai-workflow update`
- `qa-ai-workflow validate-features`
- `qa-ai-workflow sync-adapters`

## Migration acceptance criteria

- Existing `.qa-ai/` users can upgrade without rewriting config.
- `qa-ai.config.yaml` remains valid.
- Existing adapters remain valid.
- Generated paths remain stable.
