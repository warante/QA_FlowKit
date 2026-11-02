# Modular installation (experimental)

The default install still copies the full framework. Explicit selection copies fewer **real files** into `.qa-ai/`,
not just a smaller prompt. The npm tarball remains a single complete package: download size is not reduced.

```bash
npx qa-flowkit init --modules core,adapter-codex --no-adapters
node .qa-ai/scripts/init.mjs --adapters codex
npx qa-flowkit update --modules automation-presets --dry-run --json
npx qa-flowkit update --modules automation-presets
```

`npx qa-flowkit --modules core` is also supported. `--modules all` selects everything. Core is implicit; empty/unknown
lists fail before installation writes. With no automation presets, project init defaults to `manual-only` instead of
`playwright-full`. Selecting installed templates and generating root adapters are separate operations.

## Payload boundaries

| Module                                                                                  | Payload                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`                                                                                  | Validator entrypoints, harness, contracts, rules, all 77 guidance entries, common templates/docs, shared skills, generic AGENTS.md and manual-only preset |
| `runtime-automation`                                                                    | Karate and Maestro validation implementations, loaded on demand by core entrypoints                                                                       |
| `runtime-reporting`                                                                     | Export-report, PR summaries, QA metrics and their dedicated runtime libraries                                                                             |
| `runtime-observability`                                                                 | APM intake command and Datadog/New Relic connector libraries                                                                                              |
| `runtime-development`                                                                   | Framework regression tests and smoke runners (for source-repository maintenance)                                                                          |
| `automation-presets`                                                                    | Other preset YAML files and the Karate config template                                                                                                    |
| `adapter-claude`, `adapter-opencode`, `adapter-codex`                                   | Corresponding host-specific adapter templates                                                                                                             |
| `adapter-cline`, `adapter-continue`, `adapter-aider`, `adapter-goose`, `adapter-gemini` | Corresponding host-specific adapter templates                                                                                                             |

Every optional module depends on core. All validators retain their core entrypoints; Karate/Maestro implementations
are loaded lazily only when configured. A configured framework without its runtime fails with an actionable
`update --modules runtime-automation` diagnostic, including under `--allow-missing`. It is never silently skipped.
All 77 guidance entries and governance contracts stay intact. `automation-presets` depends on `runtime-automation`;
`runtime-development` includes the other runtime modules because the regression suite imports them. Development
tests still require the source repository's bin/CI infrastructure; this module is not a standalone consumer test runner.

Runtime selection removes actual scripts and libraries. For example, core has no `karate-validate.mjs`,
`maestro-validate.mjs`, APM connectors, export-report, PR-summary implementation or framework regression suite.
`metrics`, `export-report` and `pr-summary` fail with instructions to add `runtime-reporting` when omitted.
Shared execution evidence, secret scans, SARIF, the harness and release gates remain core, not optional permissions.
Independent npm packages and selective specialist guidance remain outside this boundary.

## Detection and validation

Explicitly selected installs record modules and original payload hashes in `.qa-ai/state/install-modules.json`.
New records use version 2. Version 1 records from asset-only installs are read compatibly: all four runtime modules
are retained, since those files were previously core. The next modular update writes version 2 without pruning.
Version 2 requires dependency closure and validates path ownership and SHA-256 strings. No record means legacy/full.
Invalid, unknown or unsafe records fail closed. This is local installation
metadata, not QA evidence, signed provenance, project configuration authority or approval.

Doctor requires core plus the installed files; omitted optional templates do not cause missing-template errors.
Deleting an installed/core file still fails. No configured validators, secret scans or evidence gates are skipped.
Auto-detection and `sync-adapters --adapters all` use installed modules. The renderer never recreates omitted
Claude/OpenCode template directories. An explicitly requested unavailable host fails with instructions to add
`adapter-<host>` through update. Bootstrap also uses only available host templates.

## Updates and safety

Modular update uses a non-pruning overlay. Without `--modules`, selection is retained. With it, selection is the
union of current and requested modules. `--modules core` never removes previously installed presets or hosts;
legacy/full installations remain full. Narrowing requires an intentional fresh installation, not silent conversion.

Config, state, profiles, QA output, feature/test artifacts, active specialist cache and unowned files are retained.
All collisions are preflighted against original hashes and incoming bytes before payload writes. Local edits or
user files occupying incoming paths block the operation unless `--force` is explicit. Files no longer shipped are
retained, not deleted: update does not automatically clean obsolete files. Initial selective installs also refuse
different existing files unless `--force` is explicit. Existing root adapters keep their normal overwrite protection.

Dry-run shows mode/selection without writes; actual update performs collision preflight. The existing legacy/full
update path keeps its documented replacement semantics, so inspect its dry-run too. No automatic module removal,
downgrade, external download or external-system write occurs. The record is refreshed after copying. Back up before
updating: this is not an atomic whole-directory transaction or a sandbox against concurrent filesystem mutation.
Symlinks/junctions in module write paths are refused, including with `--force`.

Tests cover fresh core installs, expansion, preserved user files, collisions, invalid metadata, adapter generation,
doctor/target validation and installed npm packages. They do not certify live agent hosts.

## OpenCode V2

`adapter-opencode` includes the [opt-in V2 plugin](opencode-v2-plugin.md) template. Normal adapter sync does not enable
it. The plugin's SDK dependency is separate from the dependency-free QA FlowKit CLI and is installed only when the
host loads the opted-in local plugin package.
