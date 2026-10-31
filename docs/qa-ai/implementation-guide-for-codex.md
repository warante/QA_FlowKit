# Implementation Guide for Codex Desktop

This is the current target-repository usage guide, not instructions to rebuild QA FlowKit from its pre-npm design.
Framework contributors must instead follow the source repository's [AGENTS.md](../../AGENTS.md).

## Install and configure

Use Node.js 22.18+ (Node.js 24 recommended) in the repository where QA artifacts belong:

```bash
npx qa-flowkit
node .qa-ai/scripts/init.mjs --preset manual-only --qa-track quick --adapters codex,generic
npx qa-flowkit doctor
```

Choose `playwright-full` or another supported preset for an automation workflow. Installation copies the framework;
configuration is a separate step. Existing files are preserved: inspect conflicts and obtain approval before using
`--force`. Folder copying remains an alternative, not the primary distribution method.

For a repository already initialized, generate the adapter without reinstalling:

```bash
npx qa-flowkit sync-adapters --adapters codex,generic
```

The adapter provides Codex instructions and a native skill. Do not assume Claude/OpenCode slash commands exist in
Codex. Read the generated `.codex/` and skill instructions, and use the CLI loop below.

## Runtime layout

```text
.qa-ai/qa-ai.config.yaml
.qa-ai/output/
.qa-ai/features/
.qa-ai/tests/
.qa-ai/state/
AGENTS.md                  # when the generic adapter was requested
```

Only `.qa-ai/qa-ai.config.yaml` is runtime configuration. A root `qa-ai.config.yaml` is legacy migration input only.
Use configured paths, not guessed root folders. Type subfolders are created as artifacts need them.
Adapters are selected explicitly; all supported host adapters are not installed by default.

## Work through one requirement

1. Read the generated instructions, config, `.qa-ai/rules/README.md` and `.qa-ai/agents/README.md`.
2. If `knowledge.enabled` is true, load its configured summary and init decisions first.
3. Confirm the official RF ID before final tests. Save the requirement source in the repository.
4. Start the run and read the phase packet:

```bash
npx qa-flowkit run start --rf RF-101
npx qa-flowkit run next
```

Load the matching phase agent and active specialists, create only approved outputs, then validate:

```bash
npx qa-flowkit run check
npx qa-flowkit run next
```

Repeat for the contract-selected phases. The quick track includes intake, normalize, Gherkin, traceability and PR
preparation. Review the actual proposal before recording a requested `test-design` approval:

```bash
npx qa-flowkit run approve test-design --note "Reviewed RF-101 test design"
```

An approval command records a decision; it does not supply independent review or authorize unrelated changes.
If validation fails, fix the reported artifact and check again. Use `run retry` only when validation attempts have
blocked the phase. Finish with `run status` and `validate-target`; a PR summary is not an actual GitHub PR.

## Test design and automation

- Use the configured Gherkin language; Spanish features require `# language: es`.
- Include the configured acceptance criteria label and `@priority:`, `@type:` and `@manual:` tags.
- Follow `gherkin.scenarioLayout`: `one-per-file` or `multiple-per-file`; multiple scenarios require unique
  scenario-level `@id:` tags. Manual tests also have `.feature` files. Generated unit tests are out of scope.
- Use the configured UI/API framework and repository conventions. Present the implementation plan before coding.
- Test-management sync is proposal-first. Never claim an external update from a local plan or validator result.
- Test execution requires configured commands and actual result artifacts; design validation alone is not execution.

## Optional hooks and advanced evidence

Codex hooks are opt-in. Review/trust the generated configuration in the host:

```bash
npx qa-flowkit sync-adapters --adapters codex --hooks
```

Hooks are not a sandbox or certification of real-host behavior. Without them, run validation explicitly after edits
and before completion. Keep modules, commit-bound execution evidence and SARIF out of the beginner loop until needed;
see [modernization](modernization.md), [agent compatibility](agent-compatibility.md) and [CLI reference](cli-reference.md).

## Validation and completion

```bash
npx qa-flowkit validate-features
npx qa-flowkit validate-target
```

For an incomplete setup only, `validate-target --allow-empty --allow-missing --no-strict-doctor` can inspect available
artifacts; it is not the final quality gate. Report commands, outcomes, warnings and remaining work honestly. Local
fixture replay is not model execution, independent review, a production pilot or release authorization.

See [Getting Started](getting-started.md), [Workflow](workflow.md) and the real [Terminal Transcripts](terminal-transcripts.md).
