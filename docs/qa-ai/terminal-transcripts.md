# Terminal Transcripts

Real command output for the most common QA FlowKit workflows. All transcripts were captured from a clean temporary directory with only `.qa-ai/` copied in.

- [Default init (WebdriverIO + Playwright API)](#default-init-webdriverio--playwright-api)
- [Manual-only init](#manual-only-init)
- [Agent-first bootstrap](#agent-first-bootstrap)
- [Feature validation — passing](#feature-validation--passing)
- [Feature validation — failing](#feature-validation--failing)
- [Target repository validation — incomplete repo](#target-repository-validation--incomplete-repo)
- [Target repository validation — passing](#target-repository-validation--passing)

---

## Default init (WebdriverIO + Playwright API)

```
$ node .qa-ai/scripts/init.mjs

=== QA FlowKit init ===

Using base template: webdriverio-playwright-api
Using interface language: en
Using Gherkin language: en

Skipping starter QA docs. Use --with-doc-templates to generate qa-ai-output/*.md templates.
Skipping test management mapping file. Use --with-test-management-mapping to create it.

Syncing agent adapters...

=== Sync agent adapters ===

Adapter opencode:
  created .opencode
  created .opencode/agents
  created .opencode/commands
  copied  .opencode/agents/qa-workflow.md
  copied  .opencode/commands/qa-add-tests.md
  copied  .opencode/commands/qa-automation-plan.md
  copied  .opencode/commands/qa-clean.md
  copied  .opencode/commands/qa-config.md
  copied  .opencode/commands/qa-coverage.md
  copied  .opencode/commands/qa-doctor.md
  copied  .opencode/commands/qa-full-flow.md
  copied  .opencode/commands/qa-init.md
  copied  .opencode/commands/qa-status.md
  copied  .opencode/commands/qa-update-tests.md
  copied  .opencode/commands/qa-validate-features.md
  copied  .opencode/README.md

updated .qa-ai/state/init-manifest.json

Init completed. Summary:
created features
created features/accessibility
created features/api
created features/e2e
created features/functional
created features/integration
created features/manual
created qa-ai-output
created tests/api/specs
created tests/wdio/pageobjects
created tests/wdio/specs
created tests/api/clients
created tests/api/fixtures
created tests/api/helpers
created tests/api/schemas
created tests/wdio/fixtures
created tests/wdio/helpers
created qa-ai.config.yaml
created .qa-ai/agents/specialists/active.md
updated .qa-ai/state/init-manifest.json

Next: node .qa-ai/scripts/doctor.mjs
```

Then run doctor to verify:

```
$ node .qa-ai/scripts/doctor.mjs

=== QA FlowKit doctor ===

[PASS] config: qa-ai.config.yaml
[PASS] framework folder: .qa-ai
[PASS] agents folder: .qa-ai/agents
[PASS] rules folder: .qa-ai/rules
[PASS] templates folder: .qa-ai/templates
[PASS] scripts folder: .qa-ai/scripts
[PASS] presets folder: .qa-ai/presets
[PASS] adapters folder: .qa-ai/adapters
[WARN] generic agent instructions: AGENTS.md
... (framework scripts, rules, templates, agents, presets, workflows, adapter templates — all PASS) ...
[WARN] Claude adapter: .claude
[WARN] Codex adapter: .codex
[PASS] OpenCode adapter: .opencode
[WARN] Cline rules: .clinerules
... (other optional adapters — WARN, expected) ...
[PASS] configured feature root: features
[PASS] configured QA output path: qa-ai-output
[WARN] configured traceability matrix: qa-ai-output/traceability-matrix.md
[WARN] WebdriverIO config: wdio.conf.ts or wdio.conf.js or wdio.conf.mjs or wdio.conf.cjs
[WARN] Playwright API config: playwright.api.config.ts or ...
[PASS] configured UI specs path: tests/wdio/specs
[PASS] configured UI page objects path: tests/wdio/pageobjects
[PASS] configured API specs path: tests/api/specs
[PASS] init manifest: .qa-ai/state/init-manifest.json
[PASS] active specialists index: .qa-ai/agents/specialists/active.md

Result:
VALID WITH WARNINGS - 22 optional checks missing.
```

The warnings are expected for a freshly initialized repository:
- Optional adapters (`[WARN] Claude adapter`) — generate with `--adapters all` when needed.
- Framework config files (`[WARN] WebdriverIO config`) — these do not exist until you add them to your project.
- Workflow artifacts — not yet generated; they appear after the first QA flow.

---

## Manual-only init

```
$ node .qa-ai/scripts/init.mjs --preset manual-only --interface-language en --gherkin-language en --no-adapters

=== QA FlowKit init ===

Using base template: manual-only
Using interface language: en
Using Gherkin language: en

Skipping starter QA docs. Use --with-doc-templates to generate qa-ai-output/*.md templates.
Skipping test management mapping file. Use --with-test-management-mapping to create it.

Skipping agent adapter sync.

Init completed. Summary:
created features
created features/accessibility
created features/api
created features/e2e
created features/functional
created features/integration
created features/manual
created qa-ai-output
created qa-ai.config.yaml
created .qa-ai/agents/specialists/active.md
updated .qa-ai/state/init-manifest.json

Next: node .qa-ai/scripts/doctor.mjs
```

No `tests/` folders are created because `manual-only` sets all automation frameworks to `none`.

---

## Agent-first bootstrap

Copy `.qa-ai/` first, then bootstrap slash commands for Claude Code and OpenCode:

```
$ node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode

=== QA FlowKit agent bootstrap ===

claude: copied  .claude/commands/qa-init.md
opencode: copied  .opencode/commands/qa-init.md
updated .qa-ai/state/init-manifest.json

Next: open Claude Code or OpenCode in this repository and run:
/qa-init

Advanced example for a manual-only QA setup:
/qa-init --preset manual-only --adapters claude,opencode
```

Then open Claude Code or OpenCode and run `/qa-init`. The guided command asks for base template, languages, adapters and optional overrides before running `init.mjs`.

---

## Feature validation — passing

After the agent generates a valid feature file:

```
$ node .qa-ai/scripts/validate-features.mjs

=== QA AI feature validator ===

[PASS] features/functional/RF-101-TC-001-login.feature

VALID - all feature files passed.
```

A valid feature file looks like:

```gherkin
@priority:high @type:functional @manual:false @id:TC-001
Feature: RF-101 Login

Acceptance Criteria:
- User can sign in with valid credentials.

Scenario: RF-101 TC-001 Valid login
  Given a registered user
  When the user enters valid credentials
  Then the dashboard is displayed
```

---

## Feature validation — failing

When a feature file is missing required elements:

```
$ node .qa-ai/scripts/validate-features.mjs

=== QA AI feature validator ===

[FAIL] features/functional/bad-login.feature
  - Missing Acceptance Criteria.
  - Missing required tag value @type:<value>
  - Missing required tag value @manual:<value>
  - Feature title does not contain an RF-like ID.
  - Scenario title does not contain an RF-like ID.
  - Feature filename does not contain an RF-like ID.
[PASS] features/functional/RF-101-TC-001-login.feature

FAILED - 6 validation errors.
```

Fix each reported error in the failing file. See [Troubleshooting — Feature validation](troubleshooting.md#feature-validation) for resolution steps.

---

## Target repository validation — incomplete repo

After init but before the first full QA flow, use flags to match the actual state:

```
$ node .qa-ai/scripts/validate-target.mjs --allow-empty --allow-missing --no-strict-doctor

=== QA AI target repository validator ===

--- doctor ---
=== QA FlowKit doctor ===
[PASS] config: qa-ai.config.yaml
[PASS] framework folder: .qa-ai
... (all framework checks PASS) ...
[PASS] configured feature root: features
[PASS] configured QA output path: qa-ai-output
[WARN] configured traceability matrix: qa-ai-output/traceability-matrix.md
... (optional artifact warnings) ...

Result:
VALID WITH WARNINGS - 16 optional checks missing.

--- feature validation ---
=== QA AI feature validator ===
[PASS] features/functional/RF-101-TC-001-login.feature
VALID - all feature files passed.

--- traceability validation ---
=== QA AI traceability validator ===
Traceability matrix not found at qa-ai-output/traceability-matrix.md.

--- sync plan validation ---
=== QA AI sync plan validator ===
Sync plan not found at qa-ai-output/testrail-sync-plan.md.

--- active specialist validation ---
=== QA AI active specialists validator ===
[PASS] .qa-ai/agents/specialists/active.md matches qa-ai.config.yaml.

VALID - target repository validation passed.
```

Remove flags incrementally as artifacts are generated:

| Stage | Command |
|---|---|
| After init, no features yet | `validate-target.mjs --allow-empty --allow-missing --no-strict-doctor` |
| Features exist, no matrix yet | `validate-target.mjs --allow-missing --no-strict-doctor` |
| Full flow completed | `validate-target.mjs` |

---

## Target repository validation — passing

After a complete QA flow with all artifacts generated:

```
$ node .qa-ai/scripts/validate-target.mjs

=== QA AI target repository validator ===

--- doctor ---
Result:
VALID WITH WARNINGS - optional adapter checks only.

--- feature validation ---
VALID - all feature files passed.

--- traceability validation ---
[PASS] qa-ai-output/traceability-matrix.md covers identifiers from 12 feature file(s).

--- sync plan validation ---
[PASS] qa-ai-output/testrail-sync-plan.md is valid.

--- active specialist validation ---
[PASS] .qa-ai/agents/specialists/active.md matches qa-ai.config.yaml.

VALID - target repository validation passed.
```
