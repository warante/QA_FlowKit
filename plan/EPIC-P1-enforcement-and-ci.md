# EPIC-P1 - Host-native enforcement and CI integration

Goal: turn "the workflow does not depend on prompt discipline" from an instruction into a technical
guarantee on hosts that support deterministic interception (Claude Code hooks, OpenCode plugins),
and meet teams where they live: a reusable GitHub Action that runs the quality gate as a PR check.

Exit gate: on Claude Code, an agent that writes an invalid `.feature` file receives the validator
error as immediate tool feedback and cannot end its turn with a pending `run check`; any repository
can add the QA FlowKit gate to a PR in five lines of workflow YAML; shipped skills follow current
Agent Skills conventions.

Background (verified against official docs, 2026-06): Claude Code hooks (`PreToolUse`,
`PostToolUse`, `Stop`) can block actions by exiting 2 or returning `{"decision":"block"}` JSON and
feed stderr back to the model; skills support `disable-model-invocation`, `allowed-tools`, dynamic
context injection and `${CLAUDE_SKILL_DIR}`. OpenCode supports plugin event interception. Other
adapters degrade gracefully to instructions.

---

## P1-US-01 - Deterministic validation hooks

As a QA lead, I want the framework to validate agent edits the moment they happen and to block
premature turn completion, so that invalid artifacts are corrected inside the agent loop instead of
being discovered later by a human.

### P1-T-001 - Add hook runner scripts to the framework

Status: Done
Priority: P1
Depends on: none

Description: implement two host-agnostic Node scripts that hooks will call: a post-edit validator
dispatcher and a stop gate. Hosts pass event JSON on stdin; scripts answer with exit codes and JSON
per the Claude Code hooks contract (which OpenCode adapters will adapt).

Implementation notes:

- Create `.qa-ai/scripts/hooks/post-edit-validate.mjs`:
  - Reads the hook event JSON from stdin; extracts the written/edited file path(s).
  - Resolves the repo-relative path with the existing path-safety helper; non-repo paths exit 0
    (never block on out-of-scope files).
  - Dispatch table by location: files under the configured `gherkin.featurePath` ->
    `validate-features.mjs` scoped to that file (add a `--file <path>` filter flag to the validator
    if not present); files matching configured Karate spec paths -> `validate-karate-features.mjs
--file`; Maestro flow paths -> `validate-maestro-flows.mjs --file`; files under
    `qa-ai-output/` matching known artifact names (traceability matrix, sync plan, test design,
    release gate) -> their validators with `--allow-missing` semantics preserved.
  - On validation failure: print the validator findings to stderr and exit 2 (blocking feedback to
    the model). On pass or non-applicable: exit 0. Must never take longer than 10s (set
    `timeout` accordingly in hook config; the script itself enforces a soft internal budget).
  - Honors an opt-out env var `QA_FLOWKIT_DISABLE_HOOKS=1` (exit 0 immediately).
- Create `.qa-ai/scripts/hooks/stop-gate.mjs`:
  - Reads stdin event JSON. Loads the active run (if none, exit 0).
  - If the active run's current phase has produced all expected outputs but `run check` has not
    been recorded for the current artifact hashes (compare via existing baseline/hash helpers),
    exit 2 with stderr message instructing the agent (in `interfaceLanguage`) to run
    `npx qa-flowkit run check` before finishing.
  - Includes a loop guard: if the event JSON indicates the stop hook already fired for this turn
    (Claude Code provides `stop_hook_active`), exit 0 to avoid infinite loops.
- Both scripts support `--self-test` (no stdin; validates wiring; prints version; exit 0) for
  doctor checks.
- Unit tests: new `node --test` file `.qa-ai/scripts/test-hooks.mjs` registered in `package.json`
  (`qa:test-hooks`) and in `validate:oss-extraction`, feeding synthetic event JSON via stdin and
  asserting exit codes and stderr content for: invalid feature write (blocks), valid feature write
  (passes), non-repo path (passes), disabled via env (passes), stop with pending check (blocks),
  stop with completed check (passes), stop-loop guard (passes).

Acceptance criteria:

- [x] `echo '<event-json>' | node .qa-ai/scripts/hooks/post-edit-validate.mjs` with an event
      pointing to an invalid fixture `.feature` exits 2 and prints the same finding text as
      `validate-features.mjs` for that file.
- [x] The same call against a valid fixture exits 0 and prints nothing to stderr.
- [x] `QA_FLOWKIT_DISABLE_HOOKS=1` forces exit 0 for both scripts regardless of input.
- [x] `node .qa-ai/scripts/hooks/stop-gate.mjs --self-test` exits 0; with a fixture run whose
      phase outputs exist but are unchecked, the stop event exits 2 and mentions
      `npx qa-flowkit run check` (Spanish text when `interfaceLanguage: es`).
- [x] `npm run qa:test-hooks` passes and is part of `validate:oss-extraction`.
- [x] Validators invoked per-file via the new `--file` flag produce identical findings to full-run
      validation for that file (regression test).
- [x] Global Definition of Done passes.

### P1-T-002 - Wire hooks into the Claude Code adapter

Status: Done
Priority: P1
Depends on: P1-T-001

Description: ship a hooks configuration with the Claude Code adapter so installed targets get
PostToolUse validation and the Stop gate automatically, with documented opt-out.

Implementation notes:

- Add `.qa-ai/adapters/claude/settings/hooks.json` template containing a `hooks` settings fragment:
  - `PostToolUse` matcher `Write|Edit` -> command
    `node .qa-ai/scripts/hooks/post-edit-validate.mjs` with a 30s timeout.
  - `Stop` -> command `node .qa-ai/scripts/hooks/stop-gate.mjs`.
- Adapter generation (`bootstrap-agent-adapters.mjs` / `sync-agent-adapters.mjs`) merges the
  fragment into the target's `.claude/settings.json`: if the file does not exist, create it with
  exactly the fragment; if it exists, perform an additive merge that never removes or rewrites
  existing user hooks, and skip with a warning if a QA FlowKit hook entry already exists (idempotent
  re-sync). Record created files in the init manifest.
- `doctor.mjs`: warn-level check that, when the Claude adapter is installed, the settings file
  contains both hook entries and `--self-test` passes for both scripts.
- Mirror behavior for OpenCode using its native plugin/event mechanism: add
  `.qa-ai/adapters/opencode/` equivalent invoking the same two scripts (degrade to documented
  instructions if OpenCode's current plugin API cannot intercept; in that case the adapter
  instruction file must tell the agent to run the validator after every artifact edit - decision
  and rationale recorded in `docs/qa-ai/agent-compatibility.md`).
- Update the remaining adapters' instruction text (codex, cline, continue, aider, goose, gemini,
  generic `AGENTS.md`) with one paragraph: hosts without hook support must self-validate after
  every artifact write using the listed commands.
- E2E: extend `.qa-ai/scripts/smoke-test.mjs` to assert that init with the Claude adapter produces
  a parseable `.claude/settings.json` containing both hooks, and that re-running sync is
  idempotent (file unchanged on second run).

Acceptance criteria:

- [x] Fresh init with the Claude adapter creates `.claude/settings.json` whose `hooks` section has
      a `PostToolUse` entry matching `Write|Edit` and a `Stop` entry, both pointing at the framework
      scripts.
- [x] Re-running `sync-adapters` does not duplicate hook entries (file byte-identical on second
      run) and never deletes a pre-existing user hook (test with a settings file containing a
      custom hook).
- [x] `doctor` warns when hook entries are missing and passes when present.
- [x] OpenCode adapter ships the equivalent integration or the documented instruction fallback,
      and `docs/qa-ai/agent-compatibility.md` states which one and why.
- [x] All other adapter instruction files contain the self-validation paragraph (parity check
      passes).
- [x] `docs/qa-ai/agent-harness.md` gains an `Enforcement hooks` section documenting behavior,
      opt-out (`QA_FLOWKIT_DISABLE_HOOKS`), and the security boundary (hooks raise the floor; they
      do not contain a hostile agent with shell access). `README.md`/`README.es.md` safety
      sections updated.
- [x] Global Definition of Done passes.

---

## P1-US-02 - Reusable CI quality gate

As a QA team, I want a first-party GitHub Action that runs the QA FlowKit gate on every PR so that
the deterministic checks protect the main branch without custom scripting.

### P1-T-003 - Create the composite GitHub Action and init-generated workflow template

Status: Done
Priority: P1
Depends on: none

Description: add a composite action at `actions/validate/action.yml` that installs nothing beyond
Node, runs `validate-target` (and optionally the release gate), emits GitHub annotations from
findings and a job summary, and a `--with-ci` init flag that drops a ready workflow into the
target repo.

Implementation notes:

- `actions/validate/action.yml` (composite):
  - Inputs: `working-directory` (default `.`), `strict` (default `true`), `allow-empty`
    (default `false`), `allow-missing` (default `false`), `release-gate` (default `auto` =
    enterprise track only), `version` (qa-flowkit npm tag/version, default `beta`).
  - Steps: setup Node 20 (`actions/setup-node`), run
    `npx -y qa-flowkit@<version> validate-target [flags]` capturing JSON (add `--json` support to
    `validate-target.mjs` if missing: aggregate per-validator results into one JSON document).
  - A small Node step converts findings to workflow commands
    (`::error file=...,line=...::message`) and writes a Markdown summary table to
    `$GITHUB_STEP_SUMMARY`.
  - Outputs: `result` (pass/fail), `findings-count`.
- Include `actions/` in the npm pack? No - the action is consumed from the GitHub repo
  (`uses: warante/QA_FlowKit/actions/validate@main`); keep it out of `package.json` `files` and
  assert that in the pack test.
- `init.mjs --with-ci github` writes `.github/workflows/qa-flowkit.yml` in the target repo:
  triggers `pull_request`, calls the action pinned to the installed major version, manifest-tracked.
- Self-test in this repo's CI: a job runs the action against `test/fixtures/golden-target`
  (expects pass) and against a deliberately broken fixture copy (expects fail), asserting exit
  codes.
- Document a GitLab CI equivalent as a copy-paste snippet (no action mechanism) in the same doc.

Acceptance criteria:

- [x] `actions/validate/action.yml` exists, `runs.using: composite`, with the listed inputs and
      outputs.
- [x] `validate-target.mjs --json` prints a single JSON document aggregating every validator's
      name, status and findings, and exits non-zero on any failure (CLI test added).
- [x] CI job `action-self-test` passes: green on the golden target, red (and asserted as expected)
      on the broken fixture, annotations present in the failing run's log output.
- [x] `node .qa-ai/scripts/init.mjs --with-ci github` creates
      `.github/workflows/qa-flowkit.yml` in a temp target, tracked in the init manifest;
      `--with-ci` absent creates nothing.
- [x] `node .github/scripts/verify-npm-pack.mjs` confirms `actions/` is not packed.
- [x] New doc `docs/qa-ai/ci-integration.md` documents the action inputs/outputs, the generated
      workflow, the GitLab snippet, and is linked from the README documentation tables (EN/ES) and
      from `docs/qa-ai/cli-reference.md` (`--with-ci`).
- [x] Global Definition of Done passes.

---

## P1-US-03 - Skill modernization

As a Claude Code or OpenCode user, I want the shipped commands to use current Agent Skills
conventions so that gates are human-only, context loads automatically and tool access is minimal.

### P1-T-004 - Modernize shipped command frontmatter and context loading

Status: Done
Priority: P2
Depends on: none

Description: upgrade the 15 Claude Code adapter commands (and source-repo mirrors) to current
skill conventions, mirrored to OpenCode at its supported level.

Implementation notes:

- For every file in `.qa-ai/adapters/claude/commands/` and the mirror `.claude/commands/`:
  - Keep bilingual `description` (`English / Español`) and `argument-hint`.
  - Add `allowed-tools` frontmatter restricted to what each command needs (read-only commands get
    read+bash-validator access only; e.g. `qa-status`, `qa-help`, `qa-doctor`,
    `qa-validate-*` must not allow Write/Edit).
  - `qa-gate.md` and any approval-recording command get `disable-model-invocation: true` (only a
    human may start a gate decision or approval).
  - Add dynamic context injection where the host supports it: `qa-status`, `qa-help`, `qa-gate`
    and `qa-full-flow` start with an injected `npx qa-flowkit run status --json` (or `help --json`)
    output block using the host's command-injection syntax, so the skill loads with live state.
  - Keep each command under 200 lines; move shared boilerplate ("read command-interaction.md
    first") into a single referenced file rather than repeated prose where the host allows it.
- OpenCode mirrors: apply equivalent frontmatter where OpenCode supports it; otherwise keep
  behavior parity through instructions. Record per-host support in
  `docs/qa-ai/agent-compatibility.md`.
- Extend the adapter parity CI check to assert: every Claude command has `allowed-tools`; `qa-gate`
  has `disable-model-invocation: true`; descriptions remain bilingual (regex `\S+ / \S+`).

Acceptance criteria:

- [x] All 15 Claude adapter commands contain `allowed-tools`; the read-only set excludes
      Write/Edit tools (asserted by the parity check, which fails when violated - verified once by
      mutation during development).
- [x] `qa-gate.md` contains `disable-model-invocation: true` in both adapter template and
      source-repo mirror.
- [x] `qa-status`, `qa-help`, `qa-gate`, `qa-full-flow` include live-state injection per host
      syntax.
- [x] OpenCode mirrors updated; parity check passes; `docs/qa-ai/agent-compatibility.md` documents
      the per-host frontmatter support matrix.
- [x] `docs/qa-ai/customizing-agents.md` documents the conventions for teams writing their own
      commands.
- [x] Global Definition of Done passes.
