# Semantic coverage regression fixture

Synthetic RF-004 refund scenario for deterministic semantic coverage validation. No real providers, tokens, PII or secrets.

## Layout

- `requirements/RF-004-refunds.md` — reduced source requirement
- `good/` — complete criterion inventory, valid proposal contract, features and matrix
- `bad/` — missing boundary, unresolved threshold, omitted precondition, planned TC without feature, invalid technique

## Usage

Tests in `.qa-ai/scripts/test-validators.mjs` load paths under this directory. Run:

```bash
node .qa-ai/scripts/test-validators.mjs
```
