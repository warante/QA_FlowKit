# RF-101 Demo Recording Script

Use this script to record a **two-minute-or-shorter** terminal demo for TASK-057. The story matches
`[demo.md](demo.md)`, `[getting-started.md](getting-started.md)` and `npm run test:e2e-quick`.

## Goal

Show one requirement flowing through the quick track — generated artifacts, a deterministic validator failure, a
correction and a passing target gate — driven entirely by framework slash commands inside OpenCode. No manual `node`
invocations; only `npx qa-flowkit` for the initial install.

## Prerequisites

- Node.js 20+ and a clean terminal at 1080p or higher.
- QA FlowKit source checkout or packed CLI on the `rc` channel.
- OpenCode installed and available in the PATH (`opencode`).
- Empty temporary directory for the target repository.
- Hide shell prompts that expose usernames or local paths when possible.

## Recording setup

1. Increase terminal font size for readability.
2. Use a dark theme with high contrast.
3. Clear scrollback before each scene.
4. Keep total runtime under **120 seconds**; prefer fewer commands over exhaustive narration.

## Scene 1 — Install and guided init (0:00–0:20)

**Say:** "RF-101 is a login requirement. QA FlowKit installs in one command and guides you through init with slash commands."

```bash
mkdir /tmp/rf101-demo && cd /tmp/rf101-demo
npx qa-flowkit
```

**Show:** the TUI adapter selector. Choose `opencode` or your favorite cli.

```bash
opencode
```

Inside OpenCode, run the guided initialization:

```text
/qa-init
```

Answer the guided questions:

- Interface language: `1. English`
- Project name: `rf101-demo`
- Gherkin language: `1. English`
- Base template: `1. Manual only`
- Requirements source: `1. Markdown`
- Test management: `1. None`
- Issue tracker: `1. None`
- Adapters: `opencode`

**Show:** init summary with `doctor` passing, what was created, and suggested next steps.

Copy the public requirement from `[test/fixtures/quick-path/requirements/RF-101-login.md](../../test/fixtures/quick-path/requirements/RF-101-login.md)`
into `requirements/RF-101-login.md`. Show the file in a second pane or editor.

## Scene 2 — Full flow: analysis and artifacts (0:20–0:45)

**Say:** "One slash command drives the entire workflow. The agent reads the requirement, produces analysis artifacts, and runs deterministic validation at each phase."

Inside OpenCode:

```text
/qa-full-flow
```

**Agent asks:** Where is the requirement source?
**Answer:** `requirements/RF-101-login.md`

**Agent asks:** What is the official RF ID?
**Answer:** `RF-101`

**Agent asks:** Test management project/suite?
**Answer:** `None — quick track`

**Show:** the agent producing artifacts under `.qa-ai/output/`:

- `requirement-analysis.md`
- `normalized-requirements.md`

**Show:** `run check` passing in the agent's terminal output — `"ok": true`.

## Scene 3 — Intentional validator failure (0:45–1:10)

**Say:** "If a required Gherkin tag is missing, the gate fails and keeps the phase active. No restart needed."

Before the agent generates the `.feature` file, place the invalid fixture in a second terminal or editor:

Copy from `[test/fixtures/quick-path/invalid/](../../test/fixtures/quick-path/invalid/)` — a `.feature` file **without** `@manual:true`:

```text
features/functional/RF-101-TC-001-login.feature
```

When the agent reaches the Gherkin validation phase, `run check` fails.

**Show:** non-zero exit and output mentioning `@manual:true` is required. The agent reports:

> Validation blocked. The feature file is missing `@manual:true`. Add the tag and I'll retry.

**Say:** "The run stays on the Gherkin phase. State persists."

## Scene 4 — Correction, traceability and completion (1:10–1:40)

**Say:** "After correction, the same run resumes without restarting."

Replace the feature with the corrected fixture
(`[test/fixtures/quick-path/expected/features/functional/RF-101-TC-001-login.feature](../../test/fixtures/quick-path/expected/features/functional/RF-101-TC-001-login.feature)`).

Tell the agent: `Fixed — retry validation.` (or the agent detects the change and retries automatically).

**Show:** `run check` passing — `"ok": true`.

**Agent continues** the quick-track workflow:

- Generates `traceability-matrix.md`
- Generates `pr-summary.md`

**Show:** run status `completed` in the agent's output.

## Scene 5 — Target validation and closing (1:40–2:00)

**Say:** "The repository quality gate validates the full target state."

The agent runs the final gate and reports success. Optionally, the presenter can also run:

```text
/qa-status
```

**Show:** zero exit code and the final artifact tree under `.qa-ai/output/` and `features/`.

## Closing (1:55–2:00)

**Say:** "The entire workflow ran from OpenCode slash commands. No manual `node` invocations. Replay this path from the QA FlowKit source repository with `npm run test:e2e-quick`, or read the static walkthrough in `docs/qa-ai/demo.md`."

**Do not claim:** automatic Jira/TestRail writes, guaranteed model execution or productivity guarantees.

## Replay without recording

From the QA FlowKit source repository:

```bash
npm run test:e2e-quick
```

PowerShell uses the same command. Fixture root: `[test/fixtures/quick-path/](../../test/fixtures/quick-path/)`.
