# RF-101 Demo Recording Script

Use this script to record a **two-minute-or-shorter** terminal demo for TASK-057. The story matches
[`demo.md`](demo.md), [`getting-started.md`](getting-started.md) and `npm run test:e2e-quick`.

## Goal

Show one requirement flowing through the quick track: generated artifacts, a deterministic validator failure, a
correction and a passing target gate — **without** external writes, credentials or model execution.

## Prerequisites

- Node.js 20+ and a clean terminal at 1080p or higher.
- QA FlowKit source checkout or packed CLI on the `rc` channel.
- Empty temporary directory for the target repository.
- Hide shell prompts that expose usernames or local paths when possible.

## Recording setup

1. Increase terminal font size for readability.
2. Use a dark theme with high contrast.
3. Clear scrollback before each scene.
4. Keep total runtime under **120 seconds**; prefer fewer commands over exhaustive narration.

## Scene 1 — Requirement and init (0:00–0:20)

**Say:** “RF-101 is a login requirement. QA FlowKit installs a governed quick track in the target repository.”

```bash
mkdir /tmp/rf101-demo && cd /tmp/rf101-demo
npx qa-flowkit@rc init --preset manual-only --qa-track quick --adapters generic
npx qa-flowkit doctor
```

Copy the public requirement from [`test/fixtures/quick-path/requirements/RF-101-login.md`](../../test/fixtures/quick-path/requirements/RF-101-login.md)
into `requirements/RF-101-login.md`.

```bash
npx qa-flowkit run start --rf RF-101
npx qa-flowkit run next
```

**Show:** `requirements/RF-101-login.md` and the active phase packet.

## Scene 2 — Analysis artifacts (0:20–0:45)

**Say:** “The agent produces analysis artifacts. Deterministic scripts verify each phase before advancing.”

Paste or display fixture outputs under `qa-ai-output/`:

- `requirement-analysis.md`
- `normalized-requirements.md`

```bash
npx qa-flowkit run check
npx qa-flowkit run next
npx qa-flowkit run approve test-design --note "RF-101 design approved"
npx qa-flowkit run next
```

**Show:** passing `run check` JSON with `"ok": true`.

## Scene 3 — Intentional validator failure (0:45–1:05)

**Say:** “If required Gherkin tags are missing, the gate fails and keeps the phase active.”

Create `features/functional/RF-101-TC-001-login.feature` **without** `@manual:true` (see
[`test/fixtures/quick-path/invalid/`](../../test/fixtures/quick-path/invalid/)).

```bash
npx qa-flowkit run check
```

**Show:** non-zero exit and JSON with `"ok": false` mentioning `manual`.

## Scene 4 — Correction and traceability (1:05–1:35)

**Say:** “After correction, the same run resumes without restarting the workflow.”

Replace the feature with the corrected fixture
([`test/fixtures/quick-path/expected/features/functional/RF-101-TC-001-login.feature`](../../test/fixtures/quick-path/expected/features/functional/RF-101-TC-001-login.feature)).

```bash
npx qa-flowkit run check
npx qa-flowkit run next
```

Add `qa-ai-output/traceability-matrix.md` from fixtures, then:

```bash
npx qa-flowkit run check
npx qa-flowkit run next
```

Add `qa-ai-output/pr-summary.md`, then:

```bash
npx qa-flowkit run check
npx qa-flowkit run status --json
```

**Show:** run status `completed`.

## Scene 5 — Target validation (1:35–1:55)

**Say:** “The repository quality gate validates the full target state.”

```bash
npx qa-flowkit validate-target
```

**Show:** zero exit code and the final artifact tree.

## Closing (1:55–2:00)

**Say:** “Replay the verified path from the QA FlowKit repository with `npm run test:e2e-quick`, or read the static
walkthrough in `docs/qa-ai/demo.md`.”

**Do not claim:** automatic Jira/TestRail writes, guaranteed model execution or productivity guarantees.

## Replay without recording

From the QA FlowKit source repository:

```bash
npm run test:e2e-quick
```

PowerShell uses the same command. Fixture root: [`test/fixtures/quick-path/`](../../test/fixtures/quick-path/).
