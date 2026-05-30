# Getting Started

Step-by-step setup flows for each user type. Pick the one that matches your situation. See [Terminal Transcripts](terminal-transcripts.md) for real command output from each workflow.

## 5-minute quick path

From your **target** repository root (Node.js 20+):

```bash
npx qa-flowkit@beta init --preset manual-only --qa-track quick
npx qa-flowkit help
```

1. Open the repo in your AI coding tool; read `AGENTS.md` and `qa-ai.config.yaml`.
2. Run `/qa-init` or follow [context intake](workflow.md) for one sample requirement (RF).
3. Produce a test design proposal, then one `.feature` file with required tags.
4. Validate: `npx qa-flowkit validate-features` and `npx qa-flowkit validate-traceability`.

Reference layout: [golden target fixture](../../test/fixtures/golden-target/). Pilot notes: [pilot-findings.md](pilot-findings.md).

Presets: [config-schema.md](config-schema.md) · Stability: [stability-policy.md](stability-policy.md).

## Karate full (API + UI)

For teams using [Karate](https://docs.karatelabs.io/getting-started/why-karate) for API and UI automation:

```bash
npx qa-flowkit@beta init --preset karate-full
npx qa-flowkit validate-features
npx qa-flowkit validate-karate-features
```

- **Design** Gherkin stays under `features/` (`validate-features`).
- **Executable** Karate tests live under `tests/karate/features/api` and `.../ui` (`validate-karate-features`).
- Reference fixture: [test/fixtures/karate-target/](../../test/fixtures/karate-target/).

---

- [Manual QA](#manual-qa)
- [Automation QA](#automation-qa)
- [Agent-First User](#agent-first-user)
- [Maintainer](#maintainer)

---

## Manual QA

Use this flow when your team writes Gherkin test cases and tracks traceability without automation code. You do not need a test automation framework configured.

**Prerequisites**

- Node.js 20 or later.
- A copy of the QA FlowKit source repository (or just the `.qa-ai/` folder).
- A target repository where you want to add the QA AI workflow.

**Step 1 — Copy the framework folder**

From the target repository root:

```bash
# Unix/macOS
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai

# PowerShell
Copy-Item -Recurse -LiteralPath C:\path\to\QA_FlowKit\.qa-ai -Destination .\.qa-ai
```

**Step 2 — Initialize with the manual-only preset**

```bash
node .qa-ai/scripts/init.mjs --preset manual-only --interface-language en --gherkin-language en
```

Use `--interface-language es --gherkin-language es` if your team writes requirements and Gherkin in Spanish.

What this creates:

```text
qa-ai.config.yaml
qa-ai-output/
features/
.opencode/
```

No `tests/` folder is created because `manual-only` sets all automation frameworks to `none`.

**Step 3 — Verify setup**

```bash
node .qa-ai/scripts/doctor.mjs
```

All checks should pass. A warning for missing automation config files is expected and safe for this preset.

**Step 4 — Open your AI coding tool**

With any supported agent (Claude Code, OpenCode, Codex, etc.), start with:

```text
Read AGENTS.md, qa-ai.config.yaml and .qa-ai/workflows/full-flow.md. Follow .qa-ai/rules/ before making changes.
```

Then provide a requirement (RF or user story) and run the full QA flow.

**Step 5 — Validate generated feature files**

After the agent generates `.feature` files:

```bash
node .qa-ai/scripts/validate-features.mjs
```

Fix any reported issues before continuing to traceability.

**Step 6 — Validate traceability**

After the traceability matrix is generated at `qa-ai-output/traceability-matrix.md`:

```bash
node .qa-ai/scripts/validate-traceability.mjs
```

**What to do next**

- Add more requirements and repeat from Step 4.
- Configure a test management tool in `qa-ai.config.yaml` (e.g. `testManagement.tool: testrail`) to enable sync plan generation.
- Review the [Workflow](workflow.md) document for the full step-by-step QA process.

---

## Automation QA

Use this flow when your repository includes test automation code (WebdriverIO, Playwright, Selenium, etc.) and you want the full requirements-to-PR workflow.

**Prerequisites**

- Node.js 20 or later.
- A copy of the `.qa-ai/` folder from QA FlowKit.
- An existing QA/automation repository (the target repo).
- Know which UI and API frameworks your team uses.

**Step 1 — Copy the framework folder**

```bash
# Unix/macOS
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai

# PowerShell
Copy-Item -Recurse -LiteralPath C:\path\to\QA_FlowKit\.qa-ai -Destination .\.qa-ai
```

**Step 2 — Initialize with your automation preset**

For WebdriverIO UI/E2E + Playwright API (default):

```bash
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api
```

For Selenium + Jest + BrowserStack:

```bash
node .qa-ai/scripts/init.mjs --preset selenium-jest-browserstack
```

To override specific frameworks without changing the full preset:

```bash
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --api-framework postman
```

**Step 3 — Verify setup**

```bash
node .qa-ai/scripts/doctor.mjs
```

Doctor warns about missing framework config files (e.g. `wdio.conf.js`, `playwright.config.js`) when they do not yet exist in your repository. This is expected before first automation setup; fix those warnings by adding the real config files as your project matures.

**Step 4 — (Optional) Add QA context**

If your team has documented QA practices in a local folder, record it:

```bash
node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge
```

Future agent sessions will read `qa-ai-output/qa-knowledge-summary.md` and `qa-ai-output/qa-init-decisions.md` before proposing defaults.

**Step 5 — Open your AI coding tool**

Start the agent with:

```text
Read AGENTS.md, qa-ai.config.yaml and .qa-ai/workflows/full-flow.md. Follow .qa-ai/rules/ before making changes.
```

Then provide a requirement and request the full flow. The agent works through requirements intake, test design, sync plan proposal, traceability matrix, automation feasibility, implementation plan and a PR-ready summary.

**Step 6 — Run the full validator suite**

After feature files and workflow artifacts exist:

```bash
node .qa-ai/scripts/validate-features.mjs
node .qa-ai/scripts/validate-traceability.mjs
node .qa-ai/scripts/validate-sync-plan.mjs
node .qa-ai/scripts/validate-active-specialists.mjs
```

Or use the aggregated target validator:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Use `--allow-empty --allow-missing --no-strict-doctor` for repositories that have not yet run a complete QA flow.

**Step 7 — (Optional) Add to CI**

Add to your target repository's CI pipeline after initialization and at least one real QA flow:

```bash
node .qa-ai/scripts/validate-target.mjs
```

**What to do next**

- Run `/qa-add-tests` in Claude Code or OpenCode for each new requirement.
- Run `/qa-automation-plan` to classify existing feature files and plan automation backlog.
- Export a reusable config profile for onboarding new repositories with the same team setup:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml
```

- Review the [Workflow](workflow.md) document for the complete step-by-step QA process.

---

## Agent-First User

Use this flow when you want Claude Code or OpenCode to guide every step, including initialization, through guided slash commands.

**Prerequisites**

- Node.js 20 or later.
- A copy of the `.qa-ai/` folder from QA FlowKit.
- Claude Code or OpenCode installed and configured for the target repository.

**Step 1 — Copy the framework folder**

```bash
# Unix/macOS
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai

# PowerShell
Copy-Item -Recurse -LiteralPath C:\path\to\QA_FlowKit\.qa-ai -Destination .\.qa-ai
```

**Step 2 — Bootstrap agent slash commands**

This copies the minimal `/qa-init` command files into the right agent folders before the full adapter sync:

```bash
# Both Claude Code and OpenCode
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode

# Claude Code only
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude

# OpenCode only
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents opencode
```

This creates `.claude/commands/qa-init.md` and/or `.opencode/commands/qa-init.md`.

**Step 3 — Open the agent and run `/qa-init`**

Open Claude Code or OpenCode in the target repository and run:

```text
/qa-init
```

> Use `/qa-init`, not `/init`. Both agents have a built-in `/init` command that is unrelated.

The guided command asks for:

- Base template (preset)
- Interface language
- Gherkin language
- Adapters to generate
- Optional framework overrides
- Whether to overwrite existing files

For a non-interactive direct form:

```text
/qa-init --preset webdriverio-playwright-api --interface-language en --gherkin-language en --adapters claude,opencode
```

**Step 4 — (Optional) Add QA context through the agent**

If you have a team QA knowledge folder in the repository:

```text
/qa-init --qa-context qa-ai-knowledge
```

The agent reads the context, summarizes it, proposes init defaults, asks for approval and then runs `init.mjs`.

**Step 5 — Run the full QA flow**

```text
/qa-full-flow
```

The agent walks through requirements intake, test design, sync plan proposal, traceability, automation feasibility and PR preparation.

**Available slash commands after initialization**

| Command                 | Purpose                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| `/qa-status`            | Summarize config, artifacts, feature health and recommended next steps |
| `/qa-add-tests`         | Add tests for a new RF without touching existing tests                 |
| `/qa-update-tests`      | Review and update existing tests after RF changes                      |
| `/qa-automation-plan`   | Classify feature files and plan automation backlog                     |
| `/qa-coverage`          | Analyze functional coverage across RFs, manual and automated tests     |
| `/qa-doctor`            | Health checks for the setup                                            |
| `/qa-validate-features` | Gherkin convention validation                                          |
| `/qa-clean`             | Preview or execute manifest-based cleanup                              |
| `/qa-config`            | Import or export reusable config profiles                              |

**What to do next**

- Use `/qa-status` at the start of any new session to orient the agent.
- Run `/qa-add-tests` for each new requirement.
- Add more adapters when your team uses other agents:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all
```

---

## Maintainer

Use this flow when you are contributing to the QA FlowKit source repository, adding new scripts, updating adapters or reviewing framework changes.

**Prerequisites**

- Node.js 20 or later.
- Git clone of the `QA_FlowKit` repository.

**Agent and release instructions**

- [AGENTS.md](../../AGENTS.md) — mandatory read for AI agents (validation, PR conventions, npm release constraints).
- [Release checklist](release-checklist.md) — human and agent steps for publishing to npm (release-please).

**Step 1 — Install dev dependencies**

Lint and format use devDependencies; CI uses a committed lockfile:

```bash
npm ci
```

**Step 2 — Run the full OSS validation suite**

Match CI before opening a PR:

```bash
npm run lint
npm run format:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

`validate:oss-extraction` alone runs:

It runs in order:

1. `doctor.mjs` — validates the framework folder itself
2. `validate-features.mjs --allow-empty` — allows no feature files in the source repo
3. `validate-traceability.mjs --allow-empty --allow-missing` — allows missing workflow artifacts
4. `validate-sync-plan.mjs --allow-empty --allow-missing` — same
5. `validate-active-specialists.mjs --allow-missing` — allows missing active specialist index
6. `test-validators.mjs` — native Node unit tests for shared validator helpers
7. `smoke-test.mjs` — copy-folder install, adapters, no-overwrite and unsafe path rejection

All seven steps must pass before opening a PR.

**Step 3 — Run individual scripts during development**

| Script                                                                        | When to run                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `node .qa-ai/scripts/doctor.mjs`                                              | After changing framework structure or required asset paths                   |
| `node .qa-ai/scripts/smoke-test.mjs`                                          | After changing `init.mjs`, `config.mjs` or `bootstrap-agent-adapters.mjs`    |
| `node .qa-ai/scripts/test-validators.mjs`                                     | After changing `lib/markdown-table.mjs` or `lib/test-management-mapping.mjs` |
| `node .qa-ai/scripts/validate-features.mjs --allow-empty`                     | After changing `validate-features.mjs`                                       |
| `node .qa-ai/scripts/validate-traceability.mjs --allow-empty --allow-missing` | After changing `validate-traceability.mjs`                                   |
| `node .qa-ai/scripts/validate-sync-plan.mjs --allow-empty --allow-missing`    | After changing `validate-sync-plan.mjs`                                      |

**Step 4 — Check strict mode separately**

`doctor --strict` is designed for initialized target repos, not the source repo. Do not run it against the source repository without a `qa-ai.config.yaml`. It is tested through smoke tests, which you can run directly:

```bash
node .qa-ai/scripts/smoke-test.mjs
```

**Adding a new adapter**

1. Add the template under `.qa-ai/adapters/<adapter-name>/`.
2. Register the adapter name in `sync-agent-adapters.mjs`.
3. Add the adapter to the `--adapters` accepted values in `init.mjs`.
4. Add a smoke test path in `smoke-test.mjs`.
5. Document the generated path in [Architecture](architecture.md) and README.

**Adding a new script**

1. Place it under `.qa-ai/scripts/`.
2. Use only native Node.js APIs (`node:fs`, `node:path`, `node:assert/strict`, etc.).
3. Add an `npm run` entry in `package.json` if the script is user-facing.
4. Add the script to `doctor.mjs` required script checks.
5. Cover it in `smoke-test.mjs`.

**Publishing a release**

Do not bump `package.json` manually for shipping. Follow [release-checklist.md](release-checklist.md) (release-please + merge Release PR).

**What to do next**

- Review [Architecture](architecture.md) for the full framework structure and safety model.
- Review [Backlog](backlog.md) for the current task list.
- See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.
