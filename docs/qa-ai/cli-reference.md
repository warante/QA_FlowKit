# CLI Reference

QA FlowKit exposes the `qa-flowkit` binary through npm and delegates target-repository work to the installed
`.qa-ai/scripts/` framework.

```bash
npx qa-flowkit@beta <command> [options]
```

During Beta, pin CI and reproducible setup to `@beta`. Stable `1.0.0` will use the default `latest` channel.
Compatibility levels and deprecations are defined in [Public Contracts](public-contracts.md).

## Setup commands

| Command     | Purpose                                                                      |
| ----------- | ---------------------------------------------------------------------------- |
| `init`      | Copy `.qa-ai/`, generate config/folders and selected adapters                |
| `update`    | Replace the installed framework while preserving state and profiles          |
| `bootstrap` | Generate minimal Claude Code/OpenCode bootstrap commands after a folder copy |
| `config`    | Export or import reusable configuration profiles                             |

### `init`

```bash
npx qa-flowkit@beta init [options]
```

Common options:

| Option                           | Values / behavior                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `--preset <name>`                | `manual-only`, `playwright-full`, `maestro-karate-mobile`, `karate-full`, legacy presets |
| `--qa-track <name>`              | `quick`, `standard`, `enterprise`                                                        |
| `--interface-language <en\|es>`  | User-facing workflow and artifact language                                               |
| `--gherkin-language <en\|es>`    | `.feature` language                                                                      |
| `--requirements-source <name>`   | `markdown`, `jira`, `confluence`, etc.                                                   |
| `--test-management-tool <name>`  | `none`, `testrail`, `zephyr`, `xray`, etc.                                               |
| `--issue-tracker <name>`         | `none`, `jira`, `github`, etc.                                                           |
| `--ui-framework <name>`          | UI/E2E framework or `none`                                                               |
| `--api-framework <name>`         | API framework or `none`                                                                  |
| `--mobile-framework <name>`      | Mobile automation framework or `none`                                                    |
| `--mobile-flows-path <path>`     | Mobile flow root, for example `tests/maestro/flows`                                      |
| `--adapters <list>`              | Comma-separated adapter IDs or `all`                                                     |
| `--no-adapters`                  | Do not generate root adapter files                                                       |
| `--qa-context <path>`            | Repository-local QA practice folder                                                      |
| `--with-doc-templates`           | Create starter files under `qa-ai-output/`                                               |
| `--with-test-management-mapping` | Create the mapping JSON template                                                         |
| `--set <key=value>`              | Repeatable scalar config override                                                        |
| `--force`                        | Explicitly allow overwrite of generated files                                            |
| `--skip-doctor`                  | CLI-only option that skips the post-init doctor run                                      |

Default init uses the Playwright UI + API preset and the OpenCode adapter. Existing target files are not
overwritten unless `--force` is explicit.

### `update`

```bash
npx qa-flowkit@beta update
```

`update` replaces only `.qa-ai/` from the installed package and preserves:

- `.qa-ai/state/`;
- `.qa-ai/config-profiles/`;
- `qa-ai.config.yaml`;
- `qa-ai-output/`;
- `features/` and automation code;
- user-owned root files.

It then refreshes detected adapters without overwriting them unless `--force` is passed and runs `doctor`.

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
| `validate-target`             | Run the complete target-repository gate                            |
| `validate-features`           | Validate QA design Gherkin                                         |
| `validate-karate-features`    | Validate executable Karate features                                |
| `validate-maestro-flows`      | Validate Maestro YAML flows and repository-local subflow paths     |
| `validate-traceability`       | Validate matrix shape, duplicates and feature coverage             |
| `validate-sync-plan`          | Validate proposal-first test-management plans and mappings         |
| `validate-active-specialists` | Compare generated specialists with config                          |
| `validate-test-design`        | Validate system and per-RF design artifacts                        |
| `validate-release-gate`       | Validate enterprise release evidence and decision                  |

Validators intended for in-progress work may expose `--allow-empty` or `--allow-missing`. Do not use permissive flags
for the final PR/release gate unless the workflow explicitly makes that artifact optional.

## Guidance and maintenance

| Command                          | Purpose                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `help [--json]`                  | Recommend the next workflow phase from state and artifacts     |
| `sync-adapters [--adapters ...]` | Refresh selected root adapter files                            |
| `clean`                          | Preview or remove generated files tracked in the init manifest |
| `version`                        | Print the installed package version                            |

Cleanup is manifest-based and dry-run/proposal-first by default. See [Cleanup](cleanup.md).

## Source-repository commands

These commands maintain QA FlowKit itself rather than a target repository:

```bash
npm run lint
npm run format:check
npm run docs:check
npm run test:e2e-quick
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

See [Getting Started](getting-started.md), [Troubleshooting](troubleshooting.md) and the
[release checklist](release-checklist.md).
