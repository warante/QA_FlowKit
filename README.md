# QA AI Starter

Portable open-source starter kit for adding an AI-assisted QA workflow to an existing QA or automation repository.

The MVP is intentionally copy-folder based: copy `.qa-ai/` into a target repository, run the local Node scripts, and the target repo receives configuration, agent instructions, workflow docs, validation scripts, templates and adapters for common coding-agent tools.

## Workflow

```text
Requirements / Jira / Confluence / Markdown
  -> requirement intake
  -> official RF + acceptance criteria validation
  -> TestRail coverage analysis
  -> Gherkin test design
  -> TestRail sync plan
  -> traceability matrix
  -> automation feasibility
  -> WebdriverIO / Playwright API implementation plan
  -> PR-ready summary
```

## MVP scope

The starter does not perform external writes to Jira, Confluence, TestRail or GitHub. It creates proposal-first artifacts and local repo files only.

Included:

- Portable `.qa-ai/` framework folder.
- Local scripts: `bootstrap-agent-adapters`, `init`, `doctor`, `clean`, `validate-features`, `sync-agent-adapters`.
- Presets for WebdriverIO + Playwright API, Selenium/Jest/BrowserStack and manual-only QA.
- Rules for approval, Gherkin, TestRail, automation, WebdriverIO and API testing.
- Templates for generated QA artifacts.
- Adapters for AGENTS.md, Claude Code, Codex, OpenCode, Cline, Continue, Aider and Goose.

## Quick start in a target repo

```bash
cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api
node .qa-ai/scripts/doctor.mjs
```

Then open the repository with your AI coding tool and start with:

```text
Read AGENTS.md, qa-ai.config.yaml and .qa-ai/workflows/full-flow.md. Follow .qa-ai/rules/ before making changes.
```

## Agent-first bootstrap

If you want to initialize through Claude Code or OpenCode with `/qa-init`, copy only `.qa-ai/`, run the bootstrap script once, then open the agent.

Unix/macOS:

```bash
cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
claude
```

PowerShell:

```powershell
Copy-Item -Recurse -LiteralPath C:\path\to\qa-ai-starter\.qa-ai -Destination .\.qa-ai
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
claude
```

Then run inside Claude Code:

```text
/qa-init
```

The command will ask for the preset, adapters and whether overwriting is allowed. You can still pass flags directly for advanced use.

For OpenCode, use the same bootstrap command and open OpenCode instead:

```bash
cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents opencode,claude
opencode
```

Then run inside OpenCode:

```text
/qa-init
```

Use `/qa-init` rather than `/init`; both Claude Code and OpenCode have their own built-in `/init` commands. The guided `/qa-init` command asks for required information and then runs `node .qa-ai/scripts/init.mjs` from the repository root. After it finishes, restart the agent if newly generated commands such as `/qa-full-flow`, `/qa-doctor`, `/qa-clean` or `/qa-validate-features` do not appear immediately.

Advanced direct form:

```text
/qa-init --preset webdriverio-playwright-api --adapters claude,opencode
```

The other slash commands are guided too:

- `/qa-full-flow` asks for the requirement source, official RF ID, TestRail project and whether to stop at proposals.
- `/qa-clean` runs a dry-run first, then asks what scope to clean before using `--force`.
- `/qa-validate-features` runs against the configured feature path by default and asks only if you want a custom path.
- `/qa-doctor` needs no input; it runs setup checks and explains the result.

## Commands

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api
node .qa-ai/scripts/init.mjs --preset manual-only --adapters generic,codex
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/validate-features.mjs
node .qa-ai/scripts/clean.mjs
```

`init.mjs` never overwrites existing files unless `--force` is passed. It always creates `AGENTS.md` when adapters are enabled, because that file is the generic compatibility layer.

## Cleanup

`init.mjs` and `sync-agent-adapters.mjs` maintain a manifest at:

```text
.qa-ai/state/init-manifest.json
```

The manifest records only files and directories that the framework actually created or overwrote. `clean.mjs` uses that manifest so cleanup does not guess.

By default, cleanup is a dry-run:

```bash
node .qa-ai/scripts/clean.mjs
```

To execute cleanup, pass `--force` plus the scope you want:

```bash
node .qa-ai/scripts/clean.mjs --generated --force
node .qa-ai/scripts/clean.mjs --adapters --empty-dirs --force
node .qa-ai/scripts/clean.mjs --all --force
```

Safety rules:

- Files are deleted only when they are tracked in the manifest.
- Files changed since init are skipped by default.
- `--include-modified` is required to delete modified tracked files.
- Directories are removed only when tracked and empty.
- The copied `.qa-ai/` framework folder is not removed by clean.

## Generated target structure

```text
qa-ai.config.yaml
AGENTS.md
.claude/
.codex/
.opencode/
.cline/
.clinerules
.continue/
.aider.conf.yml
.aider/
.goose/
docs/qa/
features/
tests/
```

The exact `tests/` subfolders are preset-aware. WebdriverIO presets create `tests/wdio/`, Playwright API presets create `tests/api/`, and manual-only presets skip automation folders.

## Gherkin conventions

- Tests are written in English.
- One `.feature` file per test case.
- One `Scenario:` or `Scenario Outline:` per file.
- Every `.feature` file includes `Acceptance Criteria:`.
- Required default tags: `@priority:`, `@type:`, `@manual:`.
- Manual tests also have `.feature` files.
- Unit tests are out of scope for generated QA cases.

## Repository mode

This project assumes a single QA + automation repository where Gherkin features, traceability docs, WebdriverIO tests and API tests can coexist.

## License

MIT. See [LICENSE](./LICENSE).
