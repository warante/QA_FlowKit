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

| Module                                                                                  | Payload                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`                                                                                  | All scripts/validators, contracts, rules, agents/specialists, common templates/docs, shared adapter templates, generic AGENTS.md and manual-only preset |
| `automation-presets`                                                                    | Other preset YAML files and the Karate config template                                                                                                  |
| `adapter-claude`, `adapter-opencode`, `adapter-codex`                                   | Corresponding host-specific adapter templates                                                                                                           |
| `adapter-cline`, `adapter-continue`, `adapter-aider`, `adapter-goose`, `adapter-gemini` | Corresponding host-specific adapter templates                                                                                                           |

Every optional module depends on core. All validators and all 77 guidance entries remain available; shared imports
and governance contracts are not removed. `automation-presets` provides scaffolding, not a runtime permission or
capability switch. User-maintained automation config can use core, and configured-framework checks still run.
Generating Karate scaffolding through init requires its template module.

This first split makes installation assets optional. Independently versioned packages, runtime libraries and
specialist-guidance capability modules remain deferred until their import graph and contract references are separated.

## Detection and validation

Explicitly selected installs record modules and original payload hashes in `.qa-ai/state/install-modules.json`.
Absence means a legacy/full installation. Invalid, unknown or unsafe records fail closed. This is local installation
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
