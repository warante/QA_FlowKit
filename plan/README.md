# QA FlowKit Improvement Plan

This folder contains the executable improvement plan that evolves QA FlowKit from the current Beta
into a complete product for QA teams that embed AI flows in their processes. It was produced from a
full repository audit plus a 2025-2026 state-of-the-art review of agentic testing, agent-host
ecosystems (skills, hooks, plugins, MCP), LLM artifact evaluation and modern quality engineering.

The plan intentionally supersedes part of the current `ROADMAP.md` scope guardrails: governed
external writes, semantic quality evaluation and AI-system testing are pulled **into** the product
scope. Task `P0-T-001` rewrites the roadmap accordingly; until that task is done, this folder and
`ROADMAP.md` are expected to disagree.

## Structure and identifiers

| Level                | ID format          | Example    |
| -------------------- | ------------------ | ---------- |
| Epic (one per phase) | `EPIC-P<phase>`    | `EPIC-P2`  |
| User story           | `P<phase>-US-<nn>` | `P2-US-01` |
| Task                 | `P<phase>-T-<nnn>` | `P2-T-003` |

Task IDs are globally unique across the plan. This numbering is independent from the historical
`tasks/EPIC-13..20` and `TASK-001..050` series and must not be mixed with them.

| Epic    | File                                                                                                     | Theme                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| EPIC-P0 | [EPIC-P0-hardening-and-first-use.md](EPIC-P0-hardening-and-first-use.md)                                 | Roadmap rewrite, first-use friction, config schema, security hardening, framework self-quality      |
| EPIC-P1 | [EPIC-P1-enforcement-and-ci.md](EPIC-P1-enforcement-and-ci.md)                                           | Host-native deterministic enforcement (hooks), reusable CI action, skill modernization              |
| EPIC-P2 | [EPIC-P2-governed-external-writes.md](EPIC-P2-governed-external-writes.md)                               | Read-only intake plus proposal -> diff -> apply -> verify writes via host MCP                       |
| EPIC-P3 | [EPIC-P3-semantic-quality-and-execution-evidence.md](EPIC-P3-semantic-quality-and-execution-evidence.md) | Gherkin quality rubric, execution evidence in the gate, exporters, automation bridges               |
| EPIC-P4 | [EPIC-P4-ai-system-testing.md](EPIC-P4-ai-system-testing.md)                                             | Testing products that contain AI: RF-LLM requirement type, non-deterministic Gherkin, eval evidence |
| EPIC-P5 | [EPIC-P5-distribution-and-ecosystem.md](EPIC-P5-distribution-and-ecosystem.md)                           | Claude Code plugin, declarative extensibility, local metrics, parser debt                           |

## Recommended execution order and dependencies

```text
EPIC-P0  ->  EPIC-P1  ->  EPIC-P2
                 \->  EPIC-P3 (P3-US-03 depends on P2-US-01 mapping fields)
                          \->  EPIC-P4 (reuses P3 evidence pipeline)
EPIC-P5 last (packages everything; P5-US-01 depends on P1-US-01 hooks)
```

Within an epic, stories are ordered; within a story, tasks are ordered. A task lists explicit
`Depends on:` entries when it needs work outside its own story.

## Global conventions (apply to every task)

These conventions are part of the acceptance criteria of **every** task even when not repeated:

1. **Bilingual interface (en/es).** All agent-facing conversational behavior must honor
   `project.interfaceLanguage` from `qa-ai.config.yaml` and follow
   `.qa-ai/workflows/command-interaction.md`. Every new or modified adapter command, agent file,
   workflow, rule or template that contains user-facing interaction must work in both `en` and
   `es`. New slash-command `description` frontmatter follows the existing bilingual pattern
   (`English text / Texto en español`). Gherkin content language remains controlled exclusively by
   `gherkin.language`. CLI stdout/stderr remains English (machine-stable contract), but every new
   CLI command must support `--json`.
2. **Zero production dependencies.** All new Node code uses only `node:` built-ins, ES modules
   (`.mjs`), and runs on Node 20 and 22 on Linux and Windows. No new runtime npm dependencies.
   Dev-only dependencies are allowed when a task says so explicitly.
3. **Path safety.** Every config-derived or user-provided path must be resolved through the
   existing `resolveRepoPath` helper pattern; absolute paths and paths escaping the repository are
   rejected before filesystem access.
4. **Determinism.** Validators never call an AI model. The agent reasons and writes artifacts; the
   scripts decide pass/fail. New randomness (IDs, timestamps) must be injectable for tests.
5. **Adapter parity.** Any change to `.claude/commands|agents` or `.qa-ai/adapters/claude/` must be
   mirrored in `.qa-ai/adapters/opencode/` (and `.opencode/` in this source repo) with the host's
   native format. Other adapters (codex, cline, continue, aider, goose, gemini, generic
   `AGENTS.md`) receive at minimum an updated instruction text describing the same behavior. The
   adapter-parity CI check must keep passing.
6. **Documentation.** Every task updates the documentation it touches: `docs/qa-ai/*` pages,
   `docs/qa-ai/cli-reference.md` for CLI changes, `docs/qa-ai/config-schema.md` for config keys,
   `README.md` **and** `README.es.md` for user-visible product changes, and `CHANGELOG.md` is left
   alone (release-please owns it). `npm run docs:check` must pass.
7. **Tests.** Every behavior change adds tests to the appropriate suite:
   `.qa-ai/scripts/test-validators.mjs`, `.qa-ai/scripts/test-harness.mjs`,
   `.qa-ai/scripts/test-cli-integration.mjs`, smoke tests, or new `node --test` files registered in
   `package.json` and in `validate:oss-extraction`.
8. **Definition of Done (global).** After each task the following all exit 0 from the repo root:

   ```bash
   npm run lint
   npm run format:check
   npm run docs:check
   npm run validate:oss-extraction
   node .github/scripts/verify-npm-pack.mjs
   ```

9. **No release actions.** Never bump versions, edit `CHANGELOG.md`, create tags or publish;
   release-please owns releases.
10. **Contracts.** Changes to public contracts (CLI flags, config keys, workflow phases, state
    schema) must be additive within `v1` or introduce a new versioned contract file, must be
    reflected in `.qa-ai/contracts/public-contracts.v1.json` stability levels, and
    `npm run contracts:check` must pass. New keys start as `@experimental`.

## How to implement (instructions for the coding agent)

1. Read this README fully, then the target epic file fully, before editing anything.
2. Implement tasks strictly in order; do not start a task whose `Depends on:` entries are not done.
3. After completing each task, run the Definition of Done commands and fix failures before moving on.
4. Mark progress by changing the task's `Status:` line from `Pending` to `Done` in the epic file
   (this folder is the single tracking surface for the plan).
5. When a task's acceptance criteria conflict with observed repository reality, stop and report the
   conflict instead of improvising.
