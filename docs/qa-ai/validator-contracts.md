# Validator contracts (1.0 freeze)

This document defines the default and strict behavior for QA FlowKit validators at the release-candidate contract
freeze. Machine-readable CLI JSON surfaces are listed in
[`.qa-ai/contracts/cli-contracts.v1.json`](../../.qa-ai/contracts/cli-contracts.v1.json) and verified with
`npm run test:cli-contracts`.

## Exit codes

| Code | Meaning                                                                         |
| ---- | ------------------------------------------------------------------------------- |
| `0`  | Success, including an intentional skip via `--allow-empty` or `--allow-missing` |
| `1`  | Usage, validation, safety or runtime failure                                    |

Commands documented with `--json` write **only** parseable JSON to stdout on success. Failures still use exit code `1`;
some commands emit JSON on failure (`validate-config --json`), others emit human-readable stderr.

## Strict vs non-strict semantics

| Validator / gate              | Default                            | Strict or opt-in flags                                         | Effect                                                     |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `doctor`                      | Warnings allowed                   | `--strict`                                                     | Optional checks become failures                            |
| `validate-features`           | Warnings for folder placement      | `--strict-tags`, `--strict-layout`                             | Require recommended tags; placement warnings become errors |
| `validate-untrusted-content`  | Findings are warnings              | `--strict`                                                     | Prompt-injection-like findings fail the command            |
| `validate-external-intake`    | Injection findings are warnings    | `--strict`                                                     | Injection findings fail the command                        |
| `validate-target`             | Strict doctor + full pipeline      | `--no-strict-doctor`, `--strict-untrusted-content`, skip flags | Aggregates child validators; see below                     |
| `validate-test-coverage`      | `mode` from config (`off` default) | `--mode advisory\|strict`                                      | Advisory warns; strict fails                               |
| `validate-quality-report`     | `mode` from config (`off` default) | config `gate` mode                                             | Gate mode blocks when rubric threshold is not met          |
| `validate-release-gate`       | `PENDING` invalid                  | `--allow-pending`                                              | Accept pending enterprise gate decisions                   |
| `validate-sync-*`             | Missing artifacts fail             | `--allow-missing`                                              | Skip when governed artifacts are absent                    |
| `validate-traceability`       | Empty/missing fails                | `--allow-empty`, `--allow-missing`                             | CI/bootstrap tolerant mode                                 |
| `validate-sync-plan`          | Empty/missing fails                | `--allow-empty`, `--allow-missing`                             | CI/bootstrap tolerant mode                                 |
| `validate-active-specialists` | Missing index fails                | `--allow-missing`                                              | CI/bootstrap tolerant mode                                 |
| `validate-agent-guidance`     | Invalid contract/schema fails      | `--allow-missing`                                              | CI/bootstrap tolerant mode                                 |
| `validate-config`             | Invalid schema fails               | `--allow-missing`                                              | Skip when config file is absent                            |

### `validate-target` composition

Default pipeline:

1. `doctor --strict` (unless `--no-strict-doctor`)
2. `validate-features`
3. `validate-traceability` (respecting allow flags)
4. `validate-sync-plan` (respecting allow flags)
5. `validate-active-specialists` (respecting allow flags)
6. `validate-agent-guidance` (respecting allow flags)
7. `validate-release-gate` on enterprise track
8. Optional design/coverage/quality validators based on config
9. `validate-untrusted-content` in warn mode unless `--strict-untrusted-content`
10. Optional secret scan when strict doctor is enabled

Use `--json` on `validate-target` for a machine-readable aggregate report. Child validator ordering is stable and
documented in the script source.

## Deterministic ordering

| Output                                   | Ordering rule                                              |
| ---------------------------------------- | ---------------------------------------------------------- |
| `help --json` phase lists                | Workflow `trackOrder` for the active track                 |
| `help --json` recommendations            | Required recommendations first, then recommended, optional |
| `metrics --json` runs                    | Lexicographic by `runId`                                   |
| Validator file findings                  | Lexicographic by relative file path, then line number      |
| Init manifest entries                    | Lexicographic by `path` after merge                        |
| `public-contracts.v1.json` command lists | Lexicographic                                              |

Consumers must treat unspecified optional JSON fields as additive during RC; only required top-level meanings are
frozen for 1.0.

## Deprecation warnings

`doctor` warns (non-strict) when legacy configuration keys or legacy artifact paths are detected. Legacy requirement
keys should migrate to `requirements.inferredAcceptanceCriteria` (see [beta-to-1.0-migration.md](beta-to-1.0-migration.md)).

Deprecated presets and rules aliases remain available through 1.x as documented in [public-contracts.md](public-contracts.md).

## Verification

```bash
npm run test:cli-contracts
npm run test:cli-contracts:unit
```

Related:

- [CLI reference](cli-reference.md)
- [Public contracts](public-contracts.md)
- [Schema compatibility](schema-compatibility.md)
