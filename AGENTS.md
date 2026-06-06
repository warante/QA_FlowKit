# AGENTS.md - QA FlowKit

This file is the generic instruction layer for all AI coding agents working in **this repository** (the QA FlowKit starter and npm package source). Target repositories that run `npx qa-flowkit init` receive their own generated `AGENTS.md` from [`.qa-ai/adapters/generic/AGENTS.md`](.qa-ai/adapters/generic/AGENTS.md) (different role: QA workflow in _your_ repo, not framework maintenance).

## Two repositories

| Repository                        | `AGENTS.md`           | Purpose                                            |
| --------------------------------- | --------------------- | -------------------------------------------------- |
| **QA FlowKit source** (this repo) | Root `AGENTS.md`      | Maintain `.qa-ai/`, CLI, CI, npm releases          |
| **Your QA/automation repo**       | Generated `AGENTS.md` | Run requirements → Gherkin → traceability workflow |

## Project purpose

Build an open-source, portable QA AI workflow starter. Users install via **`npx qa-flowkit init`** (npm package `qa-flowkit`) or by copying `.qa-ai/` into a target QA/automation repository. Claude Code and OpenCode can also start through `/qa-init` after running the bootstrap script from `.qa-ai`.

## Primary goal

Implement and maintain a reusable repo-first workflow that helps QA teams move from requirements to Gherkin tests, test-management planning, automation feasibility, configured-framework implementation plans and PR-ready outputs.

## Mandatory behavior

- Read this file before making changes.
- Read `qa-ai.config.yaml` when present (usually only in target repos or local smoke fixtures—not committed in this starter root by default).
- When `knowledge.enabled` is true, read the configured QA knowledge summary and init decisions artifacts before QA workflow work.
- When changing **framework** validators or agents in this repo, read `.qa-ai/rules/README.md` and the relevant `.qa-ai/rules/*.rules.md` files so target-repo rules stay consistent.
- Target repositories use those rules during QA work; this repo’s root `AGENTS.md` focuses on maintaining the starter and npm package (see [npm releases](#npm-releases)).
- Read `.qa-ai/agents/README.md` before QA workflow work; then load the matching phase agent and active specialists listed in `.qa-ai/agents/specialists/active.md`.
- Present a plan before modifying files.
- Do not overwrite existing files unless explicitly approved or `--force` behavior is requested by the user.
- Do not create external writes to configured external tools in the MVP.
- Never store secrets in repository files (including `NPM_TOKEN`, npm tokens, or API keys in examples).
- Keep the project open-source ready.
- Before proposing a PR in this repo, ensure local validation passes (see [Validation and CI](#validation-and-ci)).

## QA rules

Align with `.qa-ai/rules/gherkin.rules.md` and `validate-features.mjs`:

- Tests use the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).
- Spanish `.feature` files must include `# language: es`.
- One `.feature` file per test case.
- Manual tests also have `.feature` files.
- Every `.feature` must include the configured acceptance criteria label: `Acceptance Criteria:` for English or `Criterios de aceptación:` for Spanish.
- **Required tags:** `@priority:`, `@type:`, `@manual:`.
- **Recommended tags:** `@rf:` (requirement ID), `@id:` (test case ID).
- RF traceability via `@rf:`, Scenario title and filename; the **Feature title does not need** an embedded RF ID.
- Unit tests are out of scope for generated QA test cases.
- The official RF ID is required before final test generation.

## Preferred implementation stack

- Node.js 20+ (`engines` in `package.json`).
- Native Node APIs where possible; runtime dependencies stay minimal (lint/format are dev-only).
- YAML config in target repos can use the simple parser in `.qa-ai/scripts/lib/utils.mjs` (no heavy YAML dependency in the published package).
- npm CLI entry: `bin/qa-flowkit.mjs` delegating to `.qa-ai/scripts/*.mjs`.

## Project structure (this repository)

```text
.qa-ai/                    portable framework (published in npm tarball)
bin/qa-flowkit.mjs         npm CLI entry
package.json               package metadata and npm scripts
.github/workflows/         CI, release-please, manual publish fallback
.github/scripts/           portable CI helpers (e.g. verify-npm-pack.mjs)
.release-please-*.json     automated versioning and changelog
AGENTS.md                  this file
docs/qa-ai/                architecture, workflow, release, troubleshooting
README.md / README.es.md   public documentation
```

## Target repository structure (after `init`)

```text
qa-ai.config.yaml
.opencode/
.opencode/commands/qa-init.md
qa-ai-output/
qa-ai-output/qa-knowledge-summary.md
qa-ai-output/qa-init-decisions.md
features/
tests/
```

Optional adapter outputs are generated only when requested with `--adapters` or bootstrap scripts:

```text
AGENTS.md
.claude/
.codex/
.cline/
.continue/
.aider.conf.yml
.goose/
GEMINI.md
.claude/commands/qa-init.md
```

## Validation and CI

Run before opening or updating a PR in this repo:

```bash
npm ci
npm run lint
npm run format:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the same checks on Ubuntu and Windows × Node 20/22.

When changing validators, agents, or packaged files, update tests in `.qa-ai/scripts/test-validators.mjs` and/or `.qa-ai/scripts/smoke-npm-pack.mjs` as appropriate.

## Pull requests and commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) in **PR titles** (squash-merge): `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `ci:`, `chore:`.
- Commits on `main` drive **release-please** versioning and `CHANGELOG.md` (see [npm releases](#npm-releases)).
- See [CONTRIBUTING.md](CONTRIBUTING.md) for the full PR checklist.

## npm releases

**Canonical guide:** [docs/qa-ai/release-checklist.md](docs/qa-ai/release-checklist.md) (includes a **For AI agents** section).

Releases are **not** done by manually bumping `package.json` and pushing tags. The primary path is **release-please** on `main`:

1. Feature/fix PRs merge with conventional titles.
2. release-please opens/updates a **Release PR** (`chore: release X.Y.Z`).
3. A human maintainer reviews and **merges the Release PR**.
4. GitHub Actions publishes to npm ([`.github/workflows/release-please.yml`](.github/workflows/release-please.yml)).

### Agents MUST

- Use conventional PR titles when summarizing work destined for `main`.
- Point maintainers to the Release PR when they ask to “release” or “publish to npm”.
- Run local validation (including `verify-npm-pack.mjs`) when touching packaged files or release workflows.
- Read `.release-please-config.json` before changing versioning or prerelease policy.

### Agents MUST NOT

- Bump `package.json` / `.release-please-manifest.json` version for a release unless explicitly asked to edit an open Release PR created by release-please.
- Run `npm publish` locally or add `NPM_TOKEN` / npm credentials to the repo.
- Create or push `v*` git tags to trigger publish (tag-based publish was removed).
- Edit `CHANGELOG.md` release sections by hand for shipping—release-please manages release sections; only edit `## Unreleased` when documenting not-yet-released work if that matches team practice.
- Configure npm Trusted Publishing (npmjs.com UI)—that is a **human maintainer** one-time setup.

### Emergency path

**Actions → Publish npm (manual fallback)** — human-triggered only. See [docs/qa-ai/npm-migration-plan.md](docs/qa-ai/npm-migration-plan.md).

## Documentation map (agents)

| Topic                                | Path                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Release / npm publish                | [docs/qa-ai/release-checklist.md](docs/qa-ai/release-checklist.md)                   |
| npm CLI contract                     | [docs/qa-ai/npm-migration-plan.md](docs/qa-ai/npm-migration-plan.md)                 |
| Full QA workflow                     | [docs/qa-ai/workflow.md](docs/qa-ai/workflow.md)                                     |
| Architecture                         | [docs/qa-ai/architecture.md](docs/qa-ai/architecture.md)                             |
| Agent harness user guide             | [docs/qa-ai/agent-harness.md](docs/qa-ai/agent-harness.md)                           |
| Agent harness technical design       | [docs/qa-ai/agent-harness-architecture.md](docs/qa-ai/agent-harness-architecture.md) |
| Agent compatibility                  | [docs/qa-ai/agent-compatibility.md](docs/qa-ai/agent-compatibility.md)               |
| Customizing agents                   | [docs/qa-ai/customizing-agents.md](docs/qa-ai/customizing-agents.md)                 |
| Troubleshooting                      | [docs/qa-ai/troubleshooting.md](docs/qa-ai/troubleshooting.md)                       |
| Framework rules index (target repos) | [.qa-ai/rules/README.md](.qa-ai/rules/README.md)                                     |
| Gherkin rules (source of truth)      | [.qa-ai/rules/gherkin.rules.md](.qa-ai/rules/gherkin.rules.md)                       |
| Phase agents index                   | [.qa-ai/agents/README.md](.qa-ai/agents/README.md)                                   |

## Completion criteria

A target user must be able to:

```bash
npx qa-flowkit init
npx qa-flowkit doctor
```

Folder-copy alternative:

```bash
cp -R qa-flowkit/.qa-ai ./target-repo/.qa-ai
cd ./target-repo
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

The generated repository must be ready for use with Codex Desktop, Claude Code and other AI coding tools.

The preferred agent-first setup is: copy `.qa-ai` or run `npx qa-flowkit init`, run `node .qa-ai/scripts/bootstrap-agent-adapters.mjs` (or `npx qa-flowkit bootstrap` after init), open Claude Code or OpenCode, then run `/qa-init`.
