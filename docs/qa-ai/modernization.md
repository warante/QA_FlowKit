# Current-agent modernization

QA FlowKit governs requirements, traceability and execution evidence; it does not replace the agent host or test runner.
Use existing tools such as Playwright's planner/generator/healer for implementation, then validate their artifacts.
Formal validity and declared coverage are not proof of functional correctness.

## Supported runtime

Node.js 22.18+ is required; Node.js 24 is recommended. CI covers Node 22/24 on Ubuntu and Windows.
Node 20 is end-of-life and no longer in the support matrix. Upgrade the runtime before updating FlowKit;
there is no configuration or artifact migration for this runtime change. Historical release notes remain unchanged.

## Compact agent entry

Sync one adapter instead of installing every integration:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters codex
```

Use the generated `qa-flowkit` skill. It resolves configuration and the next phase before reading domain guidance.
The skill alone does not slim an installation. A default/full install retains the complete runtime; explicit
module selection can omit optional implementations as described below. There is no new lite npm package.
Claude's existing slash commands/plugin and OpenCode's commands remain available.
For Codex hooks, add `--hooks` and review/trust the configuration in Codex; see [agent compatibility](agent-compatibility.md).

## Commit-bound execution evidence (opt-in)

Existing projects retain their behavior unless provenance is enabled. Add this under `execution` in the project config:

```yaml
execution:
  resultsPaths:
    - test-results/junit.xml
  provenance:
    mode: strict
    manifestPath: .qa-ai/output/execution-provenance.json
    environment: ci
    maxAgeHours: 24
```

Keep the existing `execution.commands` and `quarantine` settings. Commit configuration and source/test changes first.
Then execute the configured commands:

```bash
npx qa-flowkit execute --record-evidence
npx qa-flowkit validate-execution-evidence --json
```

Use `--record-evidence --force` to explicitly replace an earlier record. A dry-run never writes a record.
The record is marked `running` before commands execute, so interruption or a failing rerun cannot leave an old
record claiming that the new run passed. It stores command IDs/statuses, not command output, secrets or credentials.

The strict validator requires:

- a completed passing run containing every required execution command;
- the same Git commit and QA config hash, and a clean source working tree;
- the configured environment label and valid start/completion times within the age limit;
- exactly the currently configured result/eval files, with matching SHA-256 hashes;
- evidence files refreshed by the recorded execution, rather than leftovers from a previous run.

Result artifacts and the provenance file should be ignored or untracked; don't let the runner modify tracked files.
Untracked files outside the configured result patterns, provenance file and `.qa-ai/state/` make the tree dirty.
Files ignored by Git are outside the source-tree cleanliness check; this is not an attestation of ignored dependencies,
external application state or remote environments. The environment field is a label, not verification of infrastructure.
Do not use broad result globs that also match the provenance record itself.

`advisory` reports provenance problems as warnings; `off` (the default) skips this policy.
`--allow-missing` never waives strict provenance. Release gates consume the same execution evidence validator.
Keep the record and runner results as CI artifacts for the same commit. These local JSON records are not signed
attestations and cannot defend against an unrestricted agent that edits the validator, config or record itself.

## SARIF validation findings

`npx qa-flowkit validate-target --sarif` now emits SARIF 2.1.0 for CI consumption, without changing validation exit codes
or uploading anything. See [SARIF output](sarif.md) for safe file handling, location mapping and limitations.

## PR-focused impact summaries

`npx qa-flowkit pr-summary --base origin/main` produces a local Markdown or JSON summary of the committed PR diff,
exact traceability links, test IDs to review and unmapped files. It does not infer coverage or claim tests were run.
See [PR impact summaries](pr-impact-summary.md) for merge-base semantics, optional file output and limitations.

## Selected installation assets

`npx qa-flowkit init --modules core,adapter-codex` copies only core and the requested optional assets. Full installation
remains the default; validator entrypoints and governance stay core. Optional runtime modules now separate
Karate/Maestro implementations, reporting, APM intake and development tests. Configured missing runtimes fail closed.
Updates retain/expand selections without pruning user files, including compatible version-1 metadata migration.
See [modular installation](modular-installation.md) for dependencies and boundaries.

## OpenCode V2 plugin

`sync-adapters --adapters opencode --opencode-plugin` installs a local V2 plugin only after explicit opt-in.
It adds post-operation validation feedback and a bounded experimental idle verification continuation, not a sandbox
or approval. See [the V2 guide](opencode-v2-plugin.md) for the pinned SDK, loading, tests and remaining real-host evidence.

## Evidence still required from humans

No host is upgraded to real-host E2E support by these changes. Run fresh, dated sessions with supported host versions
before changing support labels. Independent review, the migration walkthrough, prospective pilots and the RC soak
remain pending until their real evidence is recorded; elapsed calendar time or a green CI run does not complete them.

Next priorities are measured pilots and evidence from real hosts before upgrading support claims.
The existing Gherkin dataset should also be used for human-reviewed semantic evaluations, not just structural checks.
