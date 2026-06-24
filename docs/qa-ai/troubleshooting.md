# Troubleshooting

Common failures and their resolutions, organized by area.

- [Init](#init)
- [Doctor](#doctor)
- [Feature validation](#feature-validation)
- [Traceability validation](#traceability-validation)
- [Sync plan validation](#sync-plan-validation)
- [CI](#ci)
- [Agent and adapter issues](#agent-and-adapter-issues)

---

## Init

### `Cannot find module` or `SyntaxError` when running `init.mjs`

**Symptom**

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'yaml' imported from ...
```

**Cause**

A third-party dependency was accidentally imported. QA FlowKit uses only native Node.js APIs.

**Fix**

Check that you are running Node.js 20 or later:

```bash
node --version
```

If the version is correct, verify that the `.qa-ai/` folder was copied intact from the source repository and that no `node_modules` installs have modified the scripts.

---

### `Error: path must stay inside the repository`

**Symptom**

```
Error: path must stay inside the repository: ../traceability.md (label: traceability matrix)
```

**Cause**

A config value or `--set` flag points to a path outside the repository root. QA FlowKit rejects all paths that resolve above the current working directory.

**Fix**

Use only repository-relative paths. For example:

```bash
# Wrong
node .qa-ai/scripts/init.mjs --set traceability.matrixPath=../traceability.md

# Correct
node .qa-ai/scripts/init.mjs --set traceability.matrixPath=qa-ai-output/traceability-matrix.md
```

The same restriction applies to `--qa-context`. The context folder must be inside the repository:

```bash
# Wrong
node .qa-ai/scripts/init.mjs --qa-context ../qa-knowledge

# Correct
node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge
```

---

### Init skips a file that should have been updated

**Symptom**

Init runs without errors but a generated file still has old content.

**Cause**

`init.mjs` never overwrites existing files by default.

**Fix**

Pass `--force` to allow overwriting:

```bash
node .qa-ai/scripts/init.mjs --force
```

Or delete the specific file and re-run without `--force`.

---

### `qa-ai.config.yaml` was not created

**Symptom**

Init completes but `qa-ai.config.yaml` does not exist.

**Cause**

Most commonly the script was run from the wrong directory. `init.mjs` writes to the current working directory.

**Fix**

Verify you are running the script from the target repository root:

```bash
# Should show the target repo root
pwd   # Unix
cd    # PowerShell

node .qa-ai/scripts/init.mjs
```

---

## Doctor

### `[FAIL] config: qa-ai.config.yaml`

**Symptom**

```
[FAIL] config: qa-ai.config.yaml
FAILED - 1 required checks failed
```

**Cause**

`qa-ai.config.yaml` does not exist. Doctor requires it in initialized target repositories and in strict mode.

**Fix**

Run init first:

```bash
node .qa-ai/scripts/init.mjs
```

If you are running doctor against the framework source repository (not a target repo), this is a warning, not a failure. The source repo detection relies on the presence of `docs/qa-ai/architecture.md`.

---

### `[FAIL] configured feature root` or `[FAIL] configured UI specs path`

**Symptom**

```
[FAIL] configured feature root: features
[FAIL] configured UI specs path: tests/wdio/specs
```

**Cause**

The folders configured in `qa-ai.config.yaml` do not exist. Doctor checks that init created them.

**Fix**

Re-run init to create the missing folders:

```bash
node .qa-ai/scripts/init.mjs
```

If the paths in config do not match your actual repository structure, update `qa-ai.config.yaml` directly or re-run init with the correct overrides:

```bash
node .qa-ai/scripts/init.mjs --ui-specs-path tests/e2e/specs --force
```

---

### `[FAIL] active specialists index: .qa-ai/agents/specialists/active.md`

**Symptom**

```
[FAIL] active specialists index: .qa-ai/agents/specialists/active.md
```

**Cause**

`qa-ai.config.yaml` exists but `active.md` was not generated. This file is created by `init.mjs` or `config.mjs --import`.

**Fix**

```bash
node .qa-ai/scripts/init.mjs --force
```

Or import a config profile which also refreshes the active specialist index:

```bash
node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml
```

---

### `[WARN]` for optional adapters (`.codex`, `.claude`, etc.)

**Symptom**

```
[WARN] Codex adapter: .codex
[WARN] Cline rules: .clinerules
```

**Cause**

These adapters were not generated during init. They are optional.

**Fix**

This is expected if you did not request those adapters. Generate them when needed:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters codex,cline
```

Or regenerate all adapters:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all
```

---

### `[WARN]` for framework config files (`wdio.conf.js`, `playwright.config.js`)

**Symptom**

```
[WARN] WebdriverIO config: wdio.conf.ts or wdio.conf.js or wdio.conf.mjs or wdio.conf.cjs
```

**Cause**

The automation framework is configured in `qa-ai.config.yaml` but the corresponding config file does not yet exist in the repository. This is normal for new repositories.

**Fix**

Create the automation framework config file as part of your normal project setup. Doctor will then pass for that check. If you are using a different file name, verify the framework value in `qa-ai.config.yaml` matches your actual setup.

---

### Doctor fails in strict mode after a successful normal run

**Symptom**

```
node .qa-ai/scripts/doctor.mjs           # passes
node .qa-ai/scripts/doctor.mjs --strict  # fails
```

**Cause**

Strict mode promotes optional workflow artifact checks to required. If configured artifacts like `qa-ai-output/traceability-matrix.md` or `qa-ai-output/requirement-analysis.md` do not yet exist, they become failures.

**Fix**

Strict mode is intended for target repositories that have already run at least one complete QA flow. Do not use it until workflow artifacts exist. For an incomplete repository use:

```bash
node .qa-ai/scripts/validate-target.mjs --allow-empty --allow-missing --no-strict-doctor
```

---

## Feature validation

### `FAILED - no feature files found`

**Symptom**

```
No .feature files found under features.
FAILED - no feature files found. Pass --allow-empty when this is expected.
```

**Cause**

The feature folder is empty or the configured `gherkin.featurePath` points to a folder that does not contain `.feature` files.

**Fix**

If you have not yet generated any feature files, use `--allow-empty` for source-repo CI or early-stage repositories:

```bash
node .qa-ai/scripts/validate-features.mjs --allow-empty
```

If features should exist, verify the path in `qa-ai.config.yaml` matches where the agent created them.

---

### `.feature` files in `features/` root instead of subfolders

**Symptom**

Files such as `features/RF-004-TC-001-….feature` sit next to empty `functional/`, `api/`, `e2e/` folders.

**Cause**

`init` only needs the feature root; subfolders are created when tests are written. Older agent instructions used a flat path under `features/` without the type subfolder.

**Fix**

1. Re-run test design with updated agents, **or** move existing files:

```bash
node .qa-ai/scripts/organize-features.mjs --dry-run
node .qa-ai/scripts/organize-features.mjs
node .qa-ai/scripts/validate-features.mjs
```

2. Use `--strict-layout` in CI if you want misplaced paths to fail:

```bash
node .qa-ai/scripts/validate-features.mjs --strict-layout
```

Mapping: `@manual:true` → `manual/`; `@type:e2e` → `e2e/`; `@type:api` or `@api` → `api/`; default → `functional/`. See [gherkin.rules.md](../../.qa-ai/rules/gherkin.rules.md).

---

### Karate features fail QA validation (or vice versa)

**Symptom**

`validate-features` fails on files under `tests/karate/` with errors about `Acceptance Criteria` or `@manual:` tags.

**Cause**

QA design rules apply only to `gherkin.featurePath` (default `features/`). Executable Karate DSL belongs under `automation.api.specsPath` / `automation.ui.specsPath`.

**Fix**

```bash
node .qa-ai/scripts/validate-features.mjs          # features/ only
node .qa-ai/scripts/validate-karate-features.mjs   # tests/karate/... when Karate is configured
```

Use preset `karate-full` or set `automation.api.framework` and `automation.ui.framework` to `karate`. See [karate.rules.md](../../.qa-ai/rules/karate.rules.md).

---

### `Missing Acceptance Criteria` or `Missing Criterios de aceptación`

**Symptom**

```
[FAIL] features/RF-101-TC-001-login.feature
  - Missing Acceptance Criteria.
```

**Cause**

The feature file does not include the acceptance criteria block immediately after the Feature narrative. The expected label is `Acceptance Criteria:` for English or `Criterios de aceptación:` for Spanish.

**Fix**

Add the acceptance criteria block:

```gherkin
Feature: RF-101 Login

Acceptance Criteria:
- User can sign in with valid credentials.

Scenario: RF-101 TC-001 Valid login
  ...
```

---

### `Expected exactly one Feature title, found 0` or `found 2`

**Symptom**

```
- Expected exactly one Feature title, found 0.
- Expected exactly one Scenario, found 2.
```

**Cause**

The file has no `Feature:` keyword, or it has more than one `Scenario:` block. QA FlowKit requires one scenario per file.

**Fix**

- If the Feature keyword is missing, add it.
- If there are multiple scenarios, split them into separate `.feature` files, one per test case.

---

### `Missing required tag value @priority:<value>`

**Symptom**

```
- Missing required tag value @priority:<value>
- Missing required tag value @type:<value>
- Missing required tag value @manual:<value>
```

**Cause**

One or more required tags are missing or present without a value (e.g. `@priority` without `:high`).

**Fix**

Add all required tags on the line before the Feature keyword:

```gherkin
@priority:high @type:functional @manual:false
Feature: RF-101 Login
```

---

### `Scenario title does not contain an RF-like ID` / `Feature filename does not contain an RF-like ID`

**Symptom**

```
- Scenario title does not contain an RF-like ID.
- Feature filename does not contain an RF-like ID.
```

**Cause**

The RF identifier (e.g. `RF-101`) is missing from the Scenario title or filename. The validator looks for a pattern matching `RF-<alphanumeric>`. The Feature title may be a clean, human-readable name; use `@rf:RF-101` for requirement traceability.

**Fix**

Include the RF ID in the filename and Scenario title, and add `@rf:` for traceability:

```
# Filename
RF-101-TC-001-login.feature

# File content
@priority:high @type:functional @manual:false @rf:RF-101 @id:TC-001
Feature: Login
  Acceptance Criteria: ...

Scenario: RF-101 TC-001 Valid login
```

---

### `Spanish Gherkin files must declare "# language: es"`

**Symptom**

```
- Spanish Gherkin files must declare "# language: es".
```

**Cause**

`gherkin.language` is configured as `es` but the file does not include the language directive on the first line.

**Fix**

Add the directive as the first line of the file:

```gherkin
# language: es
@priority:alta @type:funcional @manual:false
Característica: RF-101 Login
```

---

### `Duplicate test case identifier TC-001 appears in: ...`

**Symptom**

```
[FAIL] Duplicate identifier validation
  - Duplicate test case identifier TC-001 appears in: features/RF-101-TC-001-login.feature, features/RF-101-TC-001-duplicate.feature
```

**Cause**

Two or more feature files reference the same test case ID either in the filename or in a `@id:`, `@test:` or `@case:` tag.

**Fix**

Assign unique test case IDs. Each feature file must have a distinct identifier.

---

## Source NFR coverage validation

### `Source NFR ... requires a matching row in ## Non-functional coverage`

**Symptom**

`validate-test-coverage.mjs` reports `nfr-missing-row`, `nfr-coverage-missing` or `nfr-legacy-silenced` findings.

**Cause**

`normalized-requirements.md` lists explicit non-functional requirements, but the proposal still marks performance or
security as `not configured` or omits the `## Non-functional coverage` table.

**Fix**

1. Add one row per source NFR in `qa-ai-output/test-design-proposal.md` under `## Non-functional coverage`.
2. Choose an evidence type (`feature`, `test-plan`, `manual-charter`, `technical-review`, `residual-risk`, …).
3. Provide threshold/oracle and environment when the attribute requires them.
4. Re-run:

```bash
node .qa-ai/scripts/validate-test-coverage.mjs
node .qa-ai/scripts/validate-traceability.mjs
```

Disabling `testDesign.coverage.requirePerformanceWhenApplicable` or `requireSecurityReview` does **not** remove this
obligation for explicit source NFRs.

---

## Traceability validation

### `Traceability matrix not found`

**Symptom**

```
Traceability matrix not found at qa-ai-output/traceability-matrix.md.
FAILED - create the traceability matrix or pass --allow-missing.
```

**Cause**

The traceability matrix artifact has not been generated yet.

**Fix**

If the matrix does not exist yet, use `--allow-missing`:

```bash
node .qa-ai/scripts/validate-traceability.mjs --allow-missing
```

Once the QA flow has generated `qa-ai-output/traceability-matrix.md`, remove the flag so CI catches missing coverage.

### `Source NFR ... is missing from ## Non-functional traceability`

**Symptom**

`validate-traceability.mjs` reports missing NFR rows or a missing `## Non-functional traceability` section.

**Cause**

Normalized requirements include source NFRs, but the traceability matrix only lists functional features.

**Fix**

Add `## Non-functional traceability` with one row per `NFR ID` from `normalized-requirements.md`, then re-run:

```bash
node .qa-ai/scripts/validate-traceability.mjs
```

---

## Semantic criterion coverage validation

### `TC ... planned with Action create but feature file is missing`

**Symptom**

`validate-test-coverage.mjs` reports `missing-feature` and names the `Test ID` and expected path.

**Cause**

`test-design-proposal.md` lists `Action: create` with `Evidence type: feature`, but no matching `.feature` exists with the
same `@id:` tag.

**Fix**

Generate the missing feature or change the proposal row to `reuse`, `modify`, `pending-decision` or a non-feature evidence
type (`test-plan`, `technical-review`, etc.).

### `Criterion ... is ready but has no linked test`

**Symptom**

`validate-test-coverage.mjs` reports `criterion-without-test` for a `Criterion ID`.

**Cause**

`normalized-requirements.md` marks a criterion `ready`, but `## Proposed tests` has no row with a realizable `Action`.

**Fix**

Add a proposed test row linking the `Criterion ID` or mark the criterion `out-of-scope` / `pending-decision`.

### `uses evidence type ... as Technique`

**Symptom**

`validate-test-design.mjs` or `validate-test-coverage.mjs` reports `invalid-technique`.

**Cause**

A value such as `technical-review` or `automation-script` was placed in the `Technique` column instead of `Evidence type`.

**Fix**

Move the value to `Evidence type` and record a supported design technique (`boundary-value-analysis`, `decision-table`, etc.).

### `traceability references missing feature file`

**Symptom**

`validate-traceability.mjs` reports a matrix row pointing to a non-existent `Feature File`.

**Cause**

The traceability matrix lists a final feature path, but the file was not generated or the path is wrong.

**Fix**

Create the feature or set `Automation Status: proposal-only` until generation is approved.

---

### `identifier RF-101 is missing from qa-ai-output/traceability-matrix.md`

**Symptom**

```
[FAIL] features/RF-101-TC-001-login.feature identifier RF-101 is missing from qa-ai-output/traceability-matrix.md.
```

**Cause**

A feature file contains an RF/test identifier that does not appear anywhere in the traceability matrix.

**Fix**

Add the missing identifier to the matrix. Each feature file must have at least one row in the matrix that includes its RF ID. Run the QA flow again to regenerate or update the matrix, or add the row manually.

---

### `Traceability matrix: missing required columns`

**Symptom**

```
[FAIL] Traceability matrix: missing required columns: Feature File, Test Management Case ID
```

**Cause**

The matrix Markdown table is missing one or more required columns. The required columns are: `Requirement Source`, `RF`, `Feature File`, `Test Management Case ID`, `Type`, `Priority`, `Automation Status`.

**Fix**

Ensure the matrix table header includes all required columns. Use the template at `.qa-ai/templates/traceability-matrix.template.md` as reference.

---

### `Identifier TC-001 appears in multiple traceability rows`

**Symptom**

```
[FAIL] Identifier TC-001 appears in multiple traceability rows: 5, 6.
```

**Cause**

The same test case ID appears in more than one row of the traceability matrix.

**Fix**

Remove the duplicate row or assign distinct IDs to each test case.

---

## Sync plan validation

### `Sync plan claims an external write already happened`

**Symptom**

```
[FAIL] Row TC-001: action appears to claim an external write was already performed: "Created in TestRail".
```

**Cause**

The sync plan contains language that describes a past write (e.g. "Created in TestRail", "Updated in TestRail", "Synced"). QA FlowKit sync plans must be proposal-first: all actions must be described as pending proposals, not completed writes.

**Fix**

Change the action language to a proposal form:

```
# Wrong
TC-001 | Created in TestRail | Done

# Correct
TC-001 | Propose create | Pending approval
```

---

### `Sync plan: missing approval reference`

**Symptom**

```
[FAIL] Sync plan does not mention approval or approval-pending language.
```

**Cause**

The sync plan document does not include the word "approval" or equivalent language. QA FlowKit requires an explicit approval gate before any external write.

**Fix**

Include an approval statement in the document preamble:

```markdown
Approval is required before any external write.
```

---

### `Duplicate external ID in test management mapping`

**Symptom**

```
[FAIL] Duplicate externalId C123 in test-management-mapping.json entries: TC-001, TC-002
```

**Cause**

Two or more mapping entries share the same `externalId`. Each external test management case ID must map to exactly one local identifier.

**Fix**

Check the mapping file and assign unique `externalId` values to each entry.

---

## CI

### `npm run validate:oss-extraction` fails with a validator error

The command runs seven steps in sequence. The first failure stops the chain. Identify which step failed from the output and refer to the relevant section above.

Steps in order:

1. `doctor.mjs` → see [Doctor](#doctor)
2. `validate-features.mjs --allow-empty` → see [Feature validation](#feature-validation)
3. `validate-traceability.mjs --allow-empty --allow-missing` → see [Traceability validation](#traceability-validation)
4. `validate-sync-plan.mjs --allow-empty --allow-missing` → see [Sync plan validation](#sync-plan-validation)
5. `validate-active-specialists.mjs --allow-missing` → check that `.qa-ai/agents/specialists/available/` contains the expected specialist files
6. `test-validators.mjs` → check `.qa-ai/scripts/lib/markdown-table.mjs` and `.qa-ai/scripts/lib/test-management-mapping.mjs` for syntax errors
7. `smoke-test.mjs` → a framework-level regression; check that the scripts in `.qa-ai/scripts/` have not been accidentally modified

---

### `validate-target.mjs` fails after initialization

**Symptom**

```
FAILED - 3 required checks failed
```

**Cause**

The target repository has been initialized but has not yet run a full QA flow. Required workflow artifacts are missing.

**Fix**

For an incomplete repository, use the flags that match your actual state:

```bash
# No feature files and no workflow artifacts yet
node .qa-ai/scripts/validate-target.mjs --allow-empty --allow-missing --no-strict-doctor

# Feature files exist but traceability matrix is not yet complete
node .qa-ai/scripts/validate-target.mjs --allow-missing
```

Remove the flags incrementally as each artifact is generated.

---

### `qa-flowkit run next` says the run is blocked

**Symptom**

```text
Blockers:
  - Blocked Gherkin test design: the official RF ID must be recorded before continuing. Run: npx qa-flowkit run set-rf RF-123
```

**Cause**

The harness found a workflow gate that needs human input, an official RF ID, a validation retry or scoped approval for
modified existing outputs.

**Fix**

Copy the command printed in the blocker message, then run `npx qa-flowkit run next` or `npx qa-flowkit run check`
again. JSON output keeps raw blocker IDs in `blockers` and includes the same user-facing text in `blockerHelp`.

Common examples:

```bash
npx qa-flowkit run set-rf RF-123
npx qa-flowkit run approve test-design
npx qa-flowkit run approve modify-existing:intake
npx qa-flowkit run retry
```

Spanish projects render the same help in Spanish, for example:

```text
Bloqueado Gherkin test design: falta aprobar la puerta "test-design". Ejecuta: npx qa-flowkit run approve test-design
```

---

### CI passes locally but fails on the CI server

**Common causes**

- Node.js version mismatch. The CI environment must use Node.js 20 or later.
- Line ending differences. QA FlowKit ships with `.gitattributes` that enforces LF. Verify `.gitattributes` was committed and that Git is not converting line endings.
- The `.qa-ai/` folder was not committed. Verify that `.gitignore` does not exclude it.

---

## Agent and adapter issues

### `/qa-init` command is not found in Claude Code or OpenCode

**Cause**

The bootstrap script was not run before opening the agent, so `.claude/commands/qa-init.md` or `.opencode/commands/qa-init.md` does not exist.

**Fix**

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

Then restart the agent session.

---

### The agent runs `/init` instead of `/qa-init` and gets unexpected results

**Cause**

Both Claude Code and OpenCode have a built-in `/init` command that is unrelated to QA FlowKit. Running `/init` invokes the built-in agent initialization, not the QA workflow.

**Fix**

Always use `/qa-init` to trigger the QA FlowKit initialization command.

---

### Slash commands are available but the agent ignores QA rules

**Cause**

The agent may not have loaded the framework instructions. Each session should start with the agent reading the key framework files.

**Fix**

At the start of each session, prompt the agent explicitly:

```text
Read AGENTS.md, qa-ai.config.yaml and .qa-ai/workflows/full-flow.md. Follow .qa-ai/rules/ before making changes.
```

Or use `/qa-status` to orient the agent and get a summary of the current configuration and recommended next steps.

---

### An adapter file was overwritten by `sync-agent-adapters.mjs`

**Cause**

`sync-agent-adapters.mjs` was run with `--force` on a file that had been manually edited.

**Fix**

QA FlowKit does not overwrite files by default. If `--force` was used accidentally, restore the file from git:

```bash
git checkout -- .claude/commands/qa-init.md
```

To customize a command without risking overwrite, copy it to a different name (e.g. `qa-init-custom.md`) and edit the copy.

---

### The agent generates tests in the wrong language

**Cause**

`gherkin.language` in `qa-ai.config.yaml` does not match the language you want.

**Fix**

Update `qa-ai.config.yaml` directly:

```yaml
gherkin:
  language: es
```

Or re-run init with the correct flag:

```bash
node .qa-ai/scripts/init.mjs --gherkin-language es --force
```

For Spanish, remind the agent to include `# language: es` in all `.feature` files.
