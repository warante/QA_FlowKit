# Compatibility fixtures

Representative beta-to-1.0 contract fixtures used by TASK-069 schema and compatibility validation.

| Fixture group                | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `config/current-beta`        | Current beta `qa-ai.config.yaml` shape         |
| `config/invalid-*`           | Unsupported version and unknown-key failures   |
| `run-state/current-beta`     | Active quick-track harness snapshot and events |
| `workflow/invalid-*`         | Unsupported workflow schema version            |
| `init-manifest/current-beta` | Cleanup manifest version 1                     |

The machine-readable inventory is [`manifest.v1.json`](manifest.v1.json). Validation runs through:

```bash
npm run test:compatibility-fixtures
```
