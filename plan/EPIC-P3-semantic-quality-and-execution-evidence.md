# EPIC-P3 - Semantic quality, execution evidence and reporting

Goal: extend the deterministic gate from form to substance. Today validators check structure
(tags, tables, traceability); this epic adds (1) a governed semantic quality rubric for generated
Gherkin ("judge as advisory, deterministic as gate"), (2) real test-execution evidence consumed by
the release gate, (3) exporters into the reporting formats teams already use, and (4) a governed
bridge to agentic automation tooling (Playwright Agents-style plan/heal loops).

Exit gate: a release gate can require, and deterministically verify, that every RF has linked
passing execution results (with flaky quarantine accounted for) and that generated scenarios
passed a versioned quality rubric; traceability and results export to Cucumber JSON/Allure.

---

## P3-US-01 - Gherkin semantic quality rubric

As a QA lead, I want generated scenarios scored against a versioned quality rubric - with a
deterministic validator enforcing the report's format, completeness and thresholds - so that "the
agent wrote tests" never silently means "the agent wrote weak tests".

### P3-T-001 - Define the versioned quality rubric and report artifact

Status: Done
Priority: P1
Depends on: none

Description: create the rubric document the agent evaluates against, and the report template it
must fill. The agent is the judge; the rubric and report formats are the contract.

Implementation notes:

- Create `.qa-ai/rules/gherkin-quality.rubric.md` with frontmatter `rubricVersion: 1` and exactly
  these dimensions (each with a one-line definition and 2-4 binary criteria, en text with es
  guidance note, since rubric criteria are interface-facing):
  1. `requirement-fidelity` - the scenario verifies the RF's acceptance criteria, not adjacent
     behavior.
  2. `observability` - every Then asserts an externally observable outcome.
  3. `atomicity` - one behavior per scenario; steps are single actions/assertions.
  4. `determinism` - no time/order/environment dependence without explicit control.
  5. `data-independence` - no hardcoded environment-specific data; parameters named.
  6. `ui-overspecification` - no incidental UI details (exact copy, pixel positions) unless the RF
     requires them.
  7. `language-clarity` - declarative business language, consistent with `gherkin.language`.
- Create `.qa-ai/templates/gherkin-quality-report.template.md`: header (`rubricVersion`, run id,
  RF id, evaluated file list with content hashes, evaluation date); one Markdown table per
  evaluated `.feature` file: `Dimension | Criterion | Verdict (pass/fail) | Evidence (quoted
line)`; a summary table `File | Dimensions passed | Verdict`.
- New agent `.qa-ai/agents/gherkin-quality-agent.md` (bilingual interaction): evaluate each
  scenario against every criterion, quote evidence lines verbatim, never edit features during
  evaluation, write the report at the configured path.
- Config (schema + presets + docs):

  ```yaml
  testDesign:
    quality:
      mode: off # off | advisory | gate
      reportPath: qa-ai-output/gherkin-quality-report.md
      minDimensionsPassed: 7
  ```

Acceptance criteria:

- [x] The rubric file exists with `rubricVersion: 1` and the seven named dimensions, each with
      only binary criteria (no numeric scoring anywhere).
- [x] Template exists and is doctor-checked when `quality.mode != off`.
- [x] Config keys validate against the schema; `mode: off` is the default in every preset.
- [x] Agent file exists, bilingual-aware, referenced from the test-design workflow.
- [x] New doc `docs/qa-ai/quality-rubric.md` explains the philosophy (judge advisory,
      deterministic gate), the dimensions and how teams version their own rubric; linked from
      README tables (EN/ES).
- [x] Global Definition of Done passes.

### P3-T-002 - Implement the quality report validator and harness phase

Status: Done
Priority: P1
Depends on: P3-T-001

Description: implement `validate-quality-report.mjs` and wire an optional `gherkin-quality` phase
after Gherkin generation.

Implementation notes:

- `validate-quality-report.mjs` (CLI, `--json`, `--allow-missing`): parse the report; checks:
  `rubricVersion` matches the shipped rubric's version; every `.feature` file under the configured
  feature path that traces to the active RF is listed with a current content hash (stale hash =
  fail: report predates the latest edit); every dimension of the rubric appears for every file;
  every criterion row has verdict pass/fail and non-empty evidence; summary table consistent with
  detail tables; in `gate` mode, every file's `Dimensions passed >= minDimensionsPassed`,
  otherwise fail listing the files and failed dimensions; in `advisory` mode, threshold misses are
  warnings.
- Wire: npm script `qa:validate-quality-report`; harness allowlist entry; additive contract phase
  `gherkin-quality` between Gherkin generation and traceability for standard/enterprise tracks
  when `quality.mode != off`; `validate-target.mjs` includes it under the same condition;
  `qa-next-steps.mjs` recommends it.
- Adapter command `/qa-quality` (claude + opencode + parity instructions elsewhere): guided,
  bilingual; runs the agent evaluation then the validator; `allowed-tools` excludes editing
  feature files (evaluation must not rewrite tests).
- Hash staleness uses the same hashing helper as the harness baselines.

Acceptance criteria:

- [x] A complete, current fixture report passes; each failure mode has a fixture + test: stale
      hash, missing file, missing dimension, empty evidence, summary/detail mismatch, below
      threshold in gate mode (fails) and advisory mode (warns).
- [x] With `quality.mode: gate` on a standard fixture, `run status --json` shows the
      `gherkin-quality` phase and `run check` executes the validator; with `off`, phase absent and
      existing harness tests pass unmodified.
- [x] `/qa-quality` exists in Claude and OpenCode adapters with bilingual description and
      restricted `allowed-tools`; parity check passes.
- [x] `docs/qa-ai/quality-rubric.md` documents validator behavior and both modes;
      `docs/qa-ai/cli-reference.md` updated.
- [x] Global Definition of Done passes.

### P3-T-003 - Add a public golden dataset of good and bad Gherkin

Status: Done
Priority: P2
Depends on: P3-T-001

Description: a labeled corpus that (a) regression-tests the structural validators, (b) gives teams
calibration material for the rubric, and (c) serves as documentation by example.

Implementation notes:

- Create `test/fixtures/gherkin-quality-dataset/` with `good/` and `bad/` subfolders; at least 10
  good and 15 bad `.feature` files (en and es examples, since `gherkin.language` supports both).
  Every bad example has a sidecar `<name>.expected.json` declaring which rubric dimensions and/or
  structural rules it violates (machine-readable labels).
- Bad examples must cover each rubric dimension at least twice and each structural validator rule
  category at least once.
- Test `test/gherkin-quality-dataset.test.mjs` (registered in package.json +
  `validate:oss-extraction`): every `good/` file passes `validate-features.mjs`; every `bad/` file
  with structural labels fails it with the labeled rule; sidecar JSON schema is itself validated.
- `docs/qa-ai/quality-rubric.md` links the dataset as calibration material.

Acceptance criteria:

- [x] Dataset exists with the minimum counts, both languages represented in both folders.
- [x] The dataset test passes and fails correctly when a good example is deliberately broken
      (verified once during development).
- [x] Every rubric dimension appears in at least two bad-example sidecars (asserted by the test).
- [x] Dataset excluded from npm pack (`verify-npm-pack.mjs` updated if needed).
- [x] Global Definition of Done passes.

---

## P3-US-02 - Execution evidence in the release gate

As a release approver, I want the gate to consume real execution results linked to the
traceability matrix - distinguishing genuine failures from quarantined flaky tests - so that the
gate decision rests on evidence, not documents.

### P3-T-004 - Parse JUnit XML and Cucumber JSON execution results

Status: Done
Priority: P1
Depends on: none

Description: implement a dependency-free results parser library producing a normalized result
model, the foundation for evidence validation and exporters.

Implementation notes:

- `.qa-ai/scripts/lib/execution-results.mjs`: `parseJUnitXml(text)` (minimal XML parsing
  sufficient for the JUnit schema subset: testsuite(s), testcase, failure/error/skipped - regex/
  state-machine based, no DOM dependency) and `parseCucumberJson(text)`; both return
  `{ cases: [{ id, name, classname/uri, status: passed|failed|skipped, durationMs, message }] }`.
- Test-case-to-test-ID matching: a documented convention - the framework test ID (e.g. `TC-RF-101-01`)
  must appear in the testcase `name`, `classname` or Cucumber tags; extraction helper
  `extractTestIds(case, idPattern)` with the ID pattern from config (default the existing test-ID
  regex used by traceability validation).
- Config (schema + docs):

  ```yaml
  execution:
    resultsPaths: [] # repo-relative globs to JUnit XML / Cucumber JSON files
    quarantine:
      mappingField: quarantined # boolean field in the test-management mapping entries
  ```

- Extend the mapping helper: optional boolean `quarantined` and string `quarantineReason` per
  entry; validation requires `quarantineReason` when `quarantined: true`.

Acceptance criteria:

- [x] Unit tests parse fixture JUnit XML (single suite, nested suites, failure, error, skipped,
      CDATA messages) and fixture Cucumber JSON (passed/failed/skipped steps -> case status)
      into the normalized model.
- [x] Malformed XML/JSON produce a structured error naming the file, not a crash.
- [x] `extractTestIds` finds IDs in name, classname and tags fixtures; returns empty list (not
      error) when absent.
- [x] Mapping validation: `quarantined: true` without `quarantineReason` fails with the entry
      named.
- [x] Config keys schema-validated; `docs/qa-ai/config-schema.md` updated.
- [x] Global Definition of Done passes.

### P3-T-005 - Validate execution evidence against the traceability matrix and gate

Status: Done
Priority: P1
Depends on: P3-T-004

Description: implement `validate-execution-evidence.mjs` and let the enterprise release gate
require it.

Implementation notes:

- `validate-execution-evidence.mjs` (CLI, `--json`, `--allow-missing`): loads configured
  `execution.resultsPaths`, the traceability matrix and the mapping file. Checks: every result
  file parses; every automated test ID in the traceability matrix (rows whose type is automated -
  reuse the matrix parser) has at least one result; report per RF: covered/uncovered, passed/
  failed/quarantined-failed; exit non-zero when any non-quarantined linked test failed or any
  automated test ID lacks results (unless `--allow-missing`); quarantined failures are warnings
  listing reason and age (`lastReviewedAt`).
- Release gate integration: extend `release-gate.template.yaml` and `validate-release-gate.mjs`
  with an optional `evidence.execution` entry pointing at result files; when `execution.
resultsPaths` is non-empty and the track is enterprise, the gate validator requires the
  execution-evidence validator to pass for a `PASS` decision (a `WAIVED` decision still requires
  approver + reason, unchanged).
- Wire: npm script, `validate-target.mjs` (only when `resultsPaths` non-empty), harness allowlist;
  `qa-next-steps.mjs` mentions evidence when configured. Update `/qa-gate` adapter command text
  (bilingual) to gather execution evidence.

Acceptance criteria:

- [x] Fixture set (matrix + mapping + JUnit results) passes when all linked tests pass; failing
      non-quarantined test -> exit non-zero naming RF and test ID; failing quarantined test ->
      warning with reason; missing results for an automated test ID -> failure unless
      `--allow-missing`.
- [x] Enterprise gate fixture: `PASS` with failing non-quarantined evidence makes
      `validate-release-gate.mjs` fail; `WAIVED` path still passes with approver + reason.
- [x] `--json` output includes the per-RF coverage report.
- [x] `docs/qa-ai/release-gate.md` documents evidence requirements;
      `docs/qa-ai/cli-reference.md` updated; README EN/ES feature list mentions execution
      evidence.
- [x] Global Definition of Done passes.

---

## P3-US-03 - Reporting exporters

As a QA team with an existing reporting stack, I want traceability and results exported to
Cucumber JSON and Allure formats so that QA FlowKit feeds the dashboards we already use.

### P3-T-006 - Implement the report exporter command

Status: Done
Priority: P2
Depends on: P3-T-004, P2-T-002 (mapping fields)

Description: add `qa-flowkit export-report --format cucumber-json|allure|junit-xml` producing
report files from the traceability matrix plus parsed execution results.

Implementation notes:

- `.qa-ai/scripts/export-report.mjs` + `bin/qa-flowkit.mjs` `commandMap` entry `export-report`.
  Flags: `--format` (required; `cucumber-json`, `allure`, `junit-xml`), `--out <dir>` (default
  `qa-ai-output/reports/<format>/`), `--json` (machine summary).
- `cucumber-json`: one entry per `.feature` in the traceability matrix; steps synthesized from the
  feature file's actual Gherkin (reuse the Gherkin reader); status from execution results when
  available, `unknown`/`skipped` otherwise.
- `allure`: emit Allure 2 `*-result.json` files (documented minimal schema: uuid, historyId from
  test ID, name, status, labels for RF id / priority / type tags, start/stop) - no Allure
  dependency, plain JSON.
- `junit-xml`: aggregate per-RF testsuites; useful for tools that only ingest JUnit.
- Output directory is manifest-tracked and inside the repo (path safety); never overwrites outside
  `--out`.
- Determinism: with injected fixed timestamps and uuids (env var or flag for tests), output is
  byte-stable.

Acceptance criteria:

- [x] Each format produces files from the golden-target fixture; snapshot tests assert byte-stable
      output with injected timestamps/uuids.
- [x] Cucumber JSON validates against the documented structure (test parses it back and checks
      required fields); Allure results contain historyId stable across runs for the same test ID.
- [x] Execution results, when configured, set statuses; without them statuses are
      `unknown`/`skipped` (both covered by tests).
- [x] `export-report` appears in CLI help, `docs/qa-ai/cli-reference.md` and a new
      `docs/qa-ai/reporting.md` (linked from README tables EN/ES).
- [x] Path-safety: `--out ../escape` is rejected (test).
- [x] Global Definition of Done passes.

---

## P3-US-04 - Governed automation bridge and impact analysis

As an automation engineer using agentic tooling (Playwright Agents or similar), I want QA FlowKit
to emit plans those tools consume and to govern their healing loop, so that FlowKit is the control
plane over - not a competitor to - my automation stack.

### P3-T-007 - Emit an automation plan consumable by agentic generators and define the governed healing loop

Status: Done
Priority: P2
Depends on: none

Description: extend the automation-implementation phase with (a) a tool-consumable plan format and
(b) a `healing` workflow: agent repairs a failing test, validators re-verify, the event log records
the repair.

Implementation notes:

- Extend `.qa-ai/templates/automation-implementation` plan template (locate exact file name in
  `.qa-ai/templates/`) with a per-test `Steps` section in imperative natural language (the format
  Playwright's generator-style agents consume: numbered user-action steps + expected outcomes),
  while keeping current sections. Add `docs/qa-ai/automation-bridge.md` showing how to hand the
  plan to Playwright Agents (`init-agents` loop) and equivalents.
- New workflow `.qa-ai/workflows/healing.md` + agent `.qa-ai/agents/test-healing-agent.md`
  (bilingual): inputs are a failing execution result (P3-T-004 model) and the linked feature/spec;
  the agent may modify only the implementation spec files configured for automation (never the
  QA-design `.feature` files and never assertions' expected business outcomes - selector/wait/data
  repairs only; business-behavior changes must go through `/qa-update-tests`); output is a healing
  log artifact `qa-ai-output/healing-log.md` (template: `Test ID | File | Failure | Repair type
(selector|wait|data|other) | Justification`).
- `validate-healing-log.mjs`: table shape; every row's test ID exists in traceability; repair type
  in enum; for rows touching files, the file is within configured automation spec paths (path
  safety); `other` requires justification text >= 20 chars. npm script + `validate-target.mjs`
  when the log exists.
- Optional harness phase `healing` (additive contract, enabled by config
  `automation.healing.enabled: false` default) inserted after implementation for standard/
  enterprise; its `run check` executes the healing-log validator.

Acceptance criteria:

- [x] The automation plan template contains the `Steps` section and the golden/karate fixtures'
      plans regenerate/validate (update fixtures as needed).
- [x] Healing log fixtures: valid passes; unknown test ID, bad repair type, out-of-path file and
      short justification each fail with the row named; `--json` supported.
- [x] With `automation.healing.enabled: true`, the `healing` phase appears for a standard fixture
      and `run check` runs the validator; default config leaves harness behavior unchanged
      (existing tests pass).
- [x] The healing agent file forbids edits to QA-design features (explicit text) and the workflow
      references `/qa-update-tests` for behavior changes.
- [x] `docs/qa-ai/automation-bridge.md` exists, linked from README tables (EN/ES), covering the
      Playwright Agents handoff and the healing loop.
- [x] Global Definition of Done passes.

### P3-T-008 - Add governed test impact analysis

Status: Done
Priority: P3
Depends on: none

Description: the agent proposes the subset of tests affected by a change; a validator checks the
proposal's coherence against the traceability matrix.

Implementation notes:

- Template `qa-ai-output/test-impact-analysis.md`: header (change ref: branch/commit/PR, date);
  table `Changed area | Affected RF | Affected test IDs | Inclusion reason`; final list `Selected
test IDs`.
- Agent `.qa-ai/agents/test-impact-agent.md` (bilingual): derive impact from the diff and the
  traceability matrix; when uncertain, include rather than exclude; never mark an RF unaffected
  without naming evidence.
- `validate-test-impact.mjs`: every test ID exists in the matrix; every affected RF exists; the
  selected list equals the union of the table's test IDs (no silent additions/removals); every
  matrix test ID linked to a listed affected RF appears (superset rule: you may select more, never
  fewer than the matrix implies for the RFs you declared affected). npm script + docs; not wired
  into harness phases (on-demand artifact) but included in `validate-target.mjs` when the file
  exists.
- Adapter command `/qa-impact` (claude + opencode + parity text): guided, bilingual.

Acceptance criteria:

- [x] Valid fixture passes; unknown test ID, unknown RF, selected-list mismatch and
      missing-matrix-test-for-affected-RF each fail with specifics; `--json` supported.
- [x] `/qa-impact` exists in both primary adapters with bilingual description; parity passes.
- [x] `docs/qa-ai/automation-bridge.md` (or `workflow.md`) documents the impact-analysis flow and
      its CI usage with the P1 action.
- [x] Global Definition of Done passes.
