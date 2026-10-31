# OpenCode Adapter

Use this folder as an instruction bridge for OpenCode or other terminal coding agents.

Related docs: [main README](../../../README.md) | [agent compatibility](../../../docs/qa-ai/agent-compatibility.md)

## Primary Files

| File                                    | Purpose                                                                |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `AGENTS.md`                             | Generic behavior and safety rules                                      |
| `.qa-ai/qa-ai.config.yaml`              | Only runtime project configuration                                     |
| `.qa-ai/output/qa-knowledge-summary.md` | Team QA practice summary when `knowledge.enabled` is true              |
| `.qa-ai/output/qa-init-decisions.md`    | Approved context-based init decisions when `knowledge.enabled` is true |
| `.qa-ai/rules/README.md` + `*.rules.md` | Mandatory workflow rules (all agents)                                  |
| `.qa-ai/agents/README.md`               | Agent loading protocol                                                 |
| `.qa-ai/workflows/`                     | Task playbooks                                                         |

Agent files in `.qa-ai/agents/` are required role instructions for QA workflow phases. If OpenCode does not expose them as callable subagents, read the relevant Markdown files and follow them directly. Always load `.qa-ai/agents/specialists/active.md` when present, plus the specialist files it lists.

## Slash Commands

| Command                 | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `/qa-init`              | Guided initialization                                                    |
| `/qa-config`            | Import or export reusable QA AI config profiles                          |
| `/qa-full-flow`         | End-to-end requirements-to-PR QA flow                                    |
| `/qa-add-tests`         | Add tests for a new RF without disturbing existing tests                 |
| `/qa-update-tests`      | Review existing tests after RF changes and apply approved updates        |
| `/qa-automation-plan`   | Classify existing `.feature` files and plan automation                   |
| `/qa-coverage`          | Analyze functional coverage across RFs, manual tests and automated tests |
| `/qa-help`              | Context-aware guidance for the next QA workflow step                     |
| `/qa-enable-enterprise` | Enable enterprise governance on standard (`project.qaTrack: enterprise`) |
| `/qa-gate`              | Record enterprise release gate decision (after governance is enabled)    |
| `/qa-status`            | Summarize config, artifacts, feature health and recommended next steps   |
| `/qa-doctor`            | Setup health checks                                                      |
| `/qa-clean`             | Manifest-based cleanup preview/execution                                 |
| `/qa-validate-features` | Gherkin convention validation                                            |

## Local Checks

| Command                                               | Purpose                                                  |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `node .qa-ai/scripts/config.mjs --help`               | Import/export reusable QA AI config profiles             |
| `node .qa-ai/scripts/doctor.mjs`                      | Check setup health                                       |
| `node .qa-ai/scripts/doctor.mjs --strict`             | CI-style checks for initialized target repositories      |
| `node .qa-ai/scripts/qa-help.mjs`                     | Recommend the next QA phase based on artifacts and track |
| `node .qa-ai/scripts/validate-target.mjs`             | Run the full target repository validation pipeline       |
| `node .qa-ai/scripts/validate-features.mjs`           | Validate `.feature` files                                |
| `node .qa-ai/scripts/validate-traceability.mjs`       | Validate traceability matrix coverage and shape          |
| `node .qa-ai/scripts/validate-sync-plan.mjs`          | Validate proposal-first sync plans and mapping shape     |
| `node .qa-ai/scripts/validate-active-specialists.mjs` | Validate active specialist index                         |
| `npm run validate:oss-extraction`                     | Run source-repo maintainer validation                    |
| `node .qa-ai/scripts/clean.mjs`                       | Preview cleanup before deleting generated files          |

Use `.qa-ai/workflows/full-flow.md` for end-to-end QA delivery and keep all external writes proposal-first.

When initializing with a QA context folder, use `/qa-init --qa-context <path>` so OpenCode reads `.qa-ai/workflows/context-intake.md` before choosing defaults.

## Validation and optional OpenCode V2 plugin

The default adapter provides commands and a native skill; it does not automatically enable validation hooks.
Without the optional plugin, run the appropriate validators after edits and before claiming completion, for example
`node .qa-ai/scripts/validate-target.mjs` and `npx qa-flowkit run check` for an active workflow run.

OpenCode V2 supports a local FlowKit plugin through explicit opt-in:

```bash
npx qa-flowkit sync-adapters --adapters opencode --opencode-plugin
```

This requires the `adapter-opencode` module in a modular installation. Review the generated
`.opencode/plugins/qa-flowkit/` package and its pinned SDK dependency before trusting/loading it.
The plugin provides post-operation validation feedback and at most one verification continuation per prompt through
`experimental.idle`. Operations have already happened: it is not a sandbox, rollback or automatic gate approval.
Validators and protected CI remain necessary. Hook-contract tests are not real-host E2E certification.
See `docs/qa-ai/opencode-v2-plugin.md` in the source repository for compatibility, setup and remaining evidence.
