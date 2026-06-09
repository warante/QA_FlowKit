# Public Contracts

This inventory classifies the QA FlowKit surfaces that users, CI jobs and agent adapters may depend on. The
machine-readable source is
[`public-contracts.v1.json`](../../.qa-ai/contracts/public-contracts.v1.json).

## Classification

| Level          | Compatibility commitment                                                                |
| -------------- | --------------------------------------------------------------------------------------- |
| `stable`       | Preserved through compatible `1.x` releases; breaking changes require deprecation first |
| `experimental` | Public and usable, but shape or wording may change before contract freeze               |
| `internal`     | Implementation detail; consumers must not depend on it                                  |
| `deprecated`   | Supported temporarily with a documented replacement and removal window                  |

Classification does not mean every current beta detail is frozen. The release-candidate gate confirms the final
stable set after migration fixtures and deferred pilot decisions are incorporated.

## CLI

Stable command names:

```text
init update bootstrap config doctor
validate-target validate-features validate-karate-features validate-maestro-flows
validate-traceability validate-sync-plan validate-active-specialists
validate-release-gate validate-test-design
sync-adapters help clean version run
```

Experimental command:

```text
validate-test-coverage
```

Stable `run` subcommands:

```text
start status next check retry set-rf approve resume
```

Exit code `0` means success. Exit code `1` means usage, validation, safety or runtime failure. Validators may return
success for an explicitly requested `--allow-empty` or `--allow-missing` outcome.

Commands documented with `--json` keep stdout as parseable JSON and send failures to stderr with a non-zero exit
code. Required top-level meanings are stable; new optional diagnostic fields may be added during beta.

Canonical options and behavior are documented in [CLI Reference](cli-reference.md).

## Configuration

`qa-ai.config.yaml` uses `version: 1`. Its documented top-level sections and existing meanings are stable:

```text
project tools agents sources knowledge requirements gherkin testrail
automation testDesign traceability release approval commands
```

New optional keys may be introduced with safe defaults. Removing a key, changing its type or changing an existing
default requires a migration path. See [Configuration Schema](config-schema.md).

`sources.analysisPath` and `testDesign.coverage` are additive experimental keys. They do not reinterpret existing
configuration.

Preset IDs are public. The `webdriverio-playwright-api` preset remains available as a deprecated compatibility preset;
new projects should use `playwright-full`.

## Workflow And State

| Surface                                         | Level          | Notes                                                     |
| ----------------------------------------------- | -------------- | --------------------------------------------------------- |
| `workflow.v1.json`, `schemaVersion: 1`          | `stable`       | Phase IDs, ordering semantics, permissions and validators |
| `run.json`, `schemaVersion: 1`                  | `experimental` | Preserved by update; migration support required before RC |
| `events.jsonl`                                  | `experimental` | Append-only audit events; individual optional fields vary |
| `.lock` and atomic temporary files              | `internal`     | Never parse or commit                                     |
| `.qa-ai/state/init-manifest.json`, `version: 1` | `experimental` | Used by cleanup and update                                |

The harness state directory is public and preserved, but consumers should use CLI JSON output instead of reading
state files directly. See [Agent Harness](agent-harness.md) and
[Harness Architecture](agent-harness-architecture.md).

## Paths And Artifacts

Stable target paths:

- `.qa-ai/`
- `qa-ai.config.yaml`
- `qa-ai-output/`
- `features/`
- `.qa-ai/config-profiles/`
- `.qa-ai/state/runs/`

Automation paths are configurable and therefore experimental as literal locations. Their configured meanings are
stable.

Rule filenames and required deterministic artifact fields are stable. Agent prompts, specialist prose and adapter
wording are experimental even when their file locations are public.

## Deprecation Policy

1. Add the replacement before deprecating the old surface.
2. Emit documentation and, where practical, `doctor` guidance for at least one beta or minor release.
3. Preserve deprecated stable surfaces throughout `1.x` unless continued support creates a security or data-loss risk.
4. Record removal in the migration guide and release notes.
5. Never silently reinterpret existing configuration or state.

Current deprecated compatibility surfaces:

| Surface                      | Replacement                      | Commitment                       |
| ---------------------------- | -------------------------------- | -------------------------------- |
| `webdriverio-playwright-api` | `playwright-full`                | No removal before post-1.0 major |
| `rules/webdriverio.rules.md` | `rules/ui-automation.rules.md`   | Alias retained through `1.x`     |
| `rules/testrail.rules.md`    | `rules/test-management.rules.md` | Alias retained through `1.x`     |

## Verification

```bash
npm run contracts:check
```

The check compares the inventory with the actual CLI, run subcommands, preset files and required collection
directories. A new public command fails CI until it is classified.
