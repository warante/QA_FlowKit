# CLI Reference

QA FlowKit exposes the `qa-flowkit` binary through npm and delegates target-repository work to the installed
`.qa-ai/scripts/` framework.

```bash
npx qa-flowkit@rc <command> [options]
```

During the RC line, pin CI and reproducible setup to `@rc`. Stable `1.0.0` will use the default `latest` channel.
Compatibility levels and deprecations are defined in [Public Contracts](public-contracts.md).

## Setup commands

| Command      | Purpose                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| (no command) | Copy `.qa-ai/` into the current repository; the main install step            |
| `update`     | Replace the installed framework while preserving state and profiles          |
| `bootstrap`  | Generate minimal Claude Code/OpenCode bootstrap commands after a folder copy |
| `config`     | Export or import reusable configuration profiles                             |

### Framework install (default command)

```bash
npx qa-flowkit@rc
```

Running `qa-flowkit` without a subcommand copies the packaged `.qa-ai/` framework folder into the current
repository. Once copied, configure QA FlowKit through one of these paths:

**Agent-first (recommended):**

```text
/qa-init
```

Open your AI coding agent and run `/qa-init` for guided interactive configuration.

**CLI-first:**

```bash
node .qa-ai/scripts/init.mjs [options]
```

Common `init.mjs` options:

| Option                             | Values / behavior                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| `--preset <name>`                  | `manual-only`, `playwright-full`, `maestro-karate-mobile`, `karate-full`, legacy presets |
| `--project-name <name>`            | Project name written to `project.name`; defaults to `package.json` name or folder name   |
| `--test-management-project <name>` | Test-management project name; defaults to the resolved project name when TM is enabled   |
| `--qa-track <name>`                | `quick`, `standard`, `enterprise`                                                        |
| `--interface-language <en\|es>`    | User-facing workflow and artifact language                                               |
| `--gherkin-language <en\|es>`      | `.feature` language                                                                      |
| `--requirements-source <name>`     | `markdown`, `jira`, `confluence`, etc.                                                   |
| `--test-management-tool <name>`    | `none`, `testrail`, `zephyr`, `xray`, etc.                                               |
| `--issue-tracker <name>`           | `none`, `jira`, `github`, etc.                                                           |
| `--ui-framework <name>`            | UI/E2E framework or `none`                                                               |
| `--api-framework <name>`           | API framework or `none`                                                                  |
| `--mobile-framework <name>`        | Mobile automation framework or `none`                                                    |
| `--mobile-flows-path <path>`       | Mobile flow root, for example `tests/maestro/flows`                                      |
| `--adapters <list>`                | Explicit comma-separated adapter IDs or `all`                                            |
| `--no-adapters`                    | Do not generate root adapter files                                                       |
| `--no-interactive`                 | Skip terminal prompts and use detected/default adapters                                  |
| `--no-feature-folders`             | Do not create canonical `features/<category>/.gitkeep` folders                           |
| `--qa-context <path>`              | Repository-local QA practice folder                                                      |
| `--with-ci <platform>`             | Generate pipeline workflow file (e.g. `github`). See [CI Integration](ci-integration.md) |
| `--with-doc-templates`             | Create starter files under `qa-ai-output/`                                               |
| `--with-test-management-mapping`   | Create the mapping JSON template                                                         |
| `--set <key=value>`                | Repeatable scalar config override                                                        |
| `--force`                          | Explicitly allow overwrite of generated files                                            |

Default init uses the Playwright UI + API preset. In an interactive terminal, it shows an AI CLI adapter selector
before syncing root command/instruction files. In non-interactive environments it detects existing host folders such
as `.claude/` and `.opencode/`, then syncs those adapters plus `generic`; when no host folder exists, only `generic`
is generated. Passing
`--adapters` is an explicit override and does not add `generic` unless requested. Existing target files are not
overwritten unless `--force` is explicit. Generated `qa-ai.config.yaml` files must not contain `CHANGE_ME`; init
derives supported placeholders and fails with the offending key paths when an unresolved placeholder remains.

### `update`

```bash
npx qa-flowkit@rc update
npx qa-flowkit@rc update --dry-run --json
```

`update` replaces only `.qa-ai/` from the installed package and preserves:

- `.qa-ai/state/`;
- `.qa-ai/config-profiles/`;
- `qa-ai.config.yaml`;
- `qa-ai-output/`;
- `features/` and automation code;
- user-owned root files.

It then refreshes detected adapters without overwriting them unless `--force` is passed and runs `doctor`.

Use `--dry-run` to review preserved paths, adapter refresh and legacy configuration keys before applying the update.
Machine-readable output is available with `--dry-run --json`. See [beta-to-1.0 migration](beta-to-1.0-migration.md).

Validator strict/non-strict semantics are frozen in [Validator contracts](validator-contracts.md). CLI JSON output
contracts are verified with `npm run test:cli-contracts`.

### Folder-copy fallback

```bash
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

For Claude Code or OpenCode bootstrap:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

## Harness commands

| Command                   | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `run start [--rf RF-123]` | Start a persistent workflow run                   |
| `run status [--json]`     | Report phase state and blockers                   |
| `run next [--json]`       | Activate or return the current phase packet       |
| `run check [--json]`      | Validate outputs and advance                      |
| `run retry [--json]`      | Recover a phase blocked after validation attempts |
| `run set-rf <id>`         | Record the confirmed official RF ID               |
| `run approve <gate>`      | Record a scoped approval                          |
| `run resume <run-id>`     | Resume an incomplete run                          |

JSON mode keeps stdout machine-readable and uses a non-zero exit code for failed checks.

Typical loop:

```bash
npx qa-flowkit run start --rf RF-101
npx qa-flowkit run next
# Agent creates the expected output.
npx qa-flowkit run check
```

## Validation commands

| Command                       | Purpose                                                            |
| ----------------------------- | ------------------------------------------------------------------ |
| `doctor [--strict]`           | Check framework, config, paths, adapters and required target state |
| `validate-config [--json]`    | Validate `qa-ai.config.yaml` against the published JSON Schema     |
| `validate-untrusted-content`  | Scan requirements and QA context for prompt-injection-like content |
| `validate-external-intake`    | Validate read-only external requirement and case imports           |
| `validate-target`             | Run the complete target-repository gate                            |
| `validate-features`           | Validate QA design Gherkin                                         |
| `validate-karate-features`    | Validate executable Karate features                                |
| `validate-maestro-flows`      | Validate Maestro YAML flows and repository-local subflow paths     |
| `validate-traceability`       | Validate matrix shape, duplicates and feature coverage             |
| `validate-sync-plan`          | Validate proposal-first test-management plans and mappings         |
| `validate-sync-diff`          | Validate governed test-management snapshot and diff artifacts      |
| `validate-sync-result`        | Validate governed test-management apply and verify artifacts       |
| `validate-active-specialists` | Compare generated specialists with config                          |
| `validate-test-design`        | Validate system and per-RF design artifacts                        |
| `validate-test-coverage`      | Validate configured cross-feature coverage obligations             |
| `validate-quality-report`     | Validate semantic Gherkin quality reports                          |
| `validate-execution-evidence` | Validate JUnit XML and Cucumber JSON results against traceability  |
| `validate-release-gate`       | Validate enterprise release evidence and decision                  |
| `validate-healing-log`        | Validate governed test healing log                                 |
| `validate-test-impact`        | Validate governed test impact analysis report                      |

`validate-untrusted-content` warns by default, supports `--strict` to fail on findings, and supports `--json` for
machine-readable `file`, `line`, `pattern` and `excerpt` findings. `validate-target` includes this scanner in warn
mode by default.

Validators intended for in-progress work may expose `--allow-empty` or `--allow-missing`. Do not use permissive flags
for the final PR/release gate unless the workflow explicitly makes that artifact optional.

`validate-quality-report` checks `testDesign.quality.reportPath` against the shipped rubric, listed feature hashes and
the configured `testDesign.quality.mode`. In `advisory` mode, threshold misses are warnings; in `gate` mode, they fail
the command.

`validate-execution-evidence` loads and parses JUnit XML or Cucumber JSON results, mapping them to automated test IDs in the traceability matrix. Failed tests that are quarantined only log warnings, while non-quarantined failures fail the gate. Missing results fail the command unless `--allow-missing` is passed.

`validate-healing-log` parses the governed test healing log `qa-ai-output/healing-log.md`. It verifies that healed test cases exist in the traceability matrix, repair types are valid, justifications are sufficient, and modified files remain strictly within the configured specs directories (never modifying Gherkin `.feature` files).

`validate-test-impact` parses the test impact analysis report `qa-ai-output/test-impact-analysis.md`. It ensures all declared test cases and RFs exist in the traceability matrix, the selected list matches the union of the table's affected test cases, and all linked tests for affected RFs are selected according to the Superset Rule.

## Guidance and maintenance

| Command                          | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `help [--json]`                  | Recommend the next workflow phase from state and artifacts       |
| `show-config [--json]`           | Print resolved config path, interface/Gherkin language and track |
| `export-report [options]`        | Export Gherkin-aligned test cases and execution results          |
| `metrics [options]`              | Compute local workflow KPIs from the run event log               |
| `sync-adapters [--adapters ...]` | Refresh selected root adapter files                              |
| `clean`                          | Preview or remove generated files tracked in the init manifest   |
| `version`                        | Print the installed package version                              |

### `export-report`

```bash
npx qa-flowkit export-report --format cucumber-json|allure|junit-xml [options]
```

Options:

- `--format <format>`: format to export (required: `cucumber-json`, `allure`, `junit-xml`).
- `--out <dir>`: output directory (defaults to `qa-ai-output/reports/<format>/`).
- `--json`: prints a machine-readable JSON summary on stdout.
- `--fixed-timestamp <epoch_or_iso>`: sets a deterministic timestamp for testing.
- `--fixed-uuid <uuid_seed>`: sets a seed for generating deterministic UUIDs.

For details, see [Reporting Exporters](reporting.md).

### `metrics`

```bash
npx qa-flowkit metrics [--json] [--since <ISO date>] [--run <run-id>]
```

`metrics` reads only `.qa-ai/state/runs/*/run.json` and `events.jsonl`. It performs no writes and never reads artifact
contents. The human output reports run counts, completion/blocking state, median and p90 durations, approval wait time,
rework approvals, per-track totals and per-phase validation failure rates.

JSON output uses `schemaVersion: 1` and includes:

- `filters`: normalized `since` and `run` filters.
- `totals`: run counts, duration KPIs, approval wait median and rework approval count.
- `tracks`: counts grouped by workflow track.
- `phases`: per-phase completed count, median/p90 duration, validation failures, validation checks, failure rate and
  retries.
- `runs`: one normalized summary per run.
- `warnings`: non-fatal parse warnings, such as malformed JSONL lines skipped during aggregation.

Cleanup is manifest-based and dry-run/proposal-first by default. See [Cleanup](cleanup.md).

## Source-repository commands

These commands maintain QA FlowKit itself rather than a target repository:

```bash
npm run lint
npm run format:check
npm run docs:check
npm run test:e2e-update-migration
npm run test:e2e-clean-install
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

See [Getting Started](getting-started.md), [Troubleshooting](troubleshooting.md) and the
[release checklist](release-checklist.md).
