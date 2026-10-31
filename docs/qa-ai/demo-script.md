# RF-101 Agent-First Tutorial Script

## Goal

Show the intended user journey: **install once in the terminal, then configure and work inside the model's CLI using
slash commands**. The agent handles internal scripts, phase progression and validation. Do not teach users to drive
`run start`, `run next`, `run check` or `node` scripts as the main path.

This replacement is an **illustrated tutorial**, not a captured model session. Display user commands and guidance,
never invented model replies or passing test output. The previous CLI fixture preview is not the product tutorial.
Keep published media unchanged until the replacement preview is reviewed.

## Prerequisites

- Node.js 22.18+; Node.js 24 recommended.
- A target repository and a coding agent with a matching slash-command adapter.
- For rendering only: external Python environment with Pillow, FFmpeg, and installed Spanish/English Windows SAPI voices.
- No model invocation or credentials are needed to render instructional cards; this is not live-host verification.

## Recording setup

Production storyboard, narration and durations: [agent-first-storyboard.v1.json](agent-first-storyboard.v1.json).
It defines eight cards spanning 115 seconds, Spanish and English narration, and both caption tracks.
The renderer checks that every shown slash command has a canonical command template.

- Keep the illustrated/non-live preview label visible throughout.
- Only the first card shows the operating-system terminal: `npx qa-flowkit`.
- Every subsequent command appears under “Inside the model's CLI”.
- Describe approvals as decisions the user must make, not decisions that happened during rendering.
- Do not show fabricated chat, JSON, validator successes or filesystem evidence.

## Scene 1 — Install once (0–10 seconds)

In the project repository, show `npx qa-flowkit`. Tell the user to select the matching agent adapter.
This is the only terminal operation in the beginner journey.

## Scene 2 — Configure inside the model (10–42 seconds)

Open the same repository in the model's CLI. Show `/qa-init` (10–28 seconds).
Explain the guided questions: language, templates, requirements, tools and review of proposed configuration.

Then show `/qa-init --qa-context qa-ai-knowledge` (28–42 seconds) as an **alternative starting form** for an existing
local QA knowledge folder, not a mandatory second initialization. The agent summarizes context and requests approval
for inferred defaults. Never replace this scene with the raw underlying init script.

## Scene 3 — Check setup and choose a task (42–76 seconds)

Show `/qa-doctor`, then `/qa-help` (42–54 seconds), both inside the model.
Then show `/qa-full-flow requirements/RF-101-login.md` (54–76 seconds).
The user supplies an existing requirement file or pasted text and confirms the official RF ID. The agent guides
intake, normalize, Gherkin design, traceability and PR preparation according to the configured track.

## Scene 4 — Review and validate in the conversation (76–102 seconds)

Show a guidance card, **not a simulated model response**, explaining review and approval (76–90 seconds).
The agent handles internal scripts; the user stays in the conversation.
Then show `/qa-validate-features` (90–102 seconds). Explain that issues can be discussed and corrected in-session.
Do not pretend a failure was observed or corrected in a real session: this video illustrates the usage pattern.
Artifact validation does not prove automated login tests were executed.

## Scene 5 — Outcome and next requirement (102–115 seconds)

Show `/qa-status` and `/qa-help`. Mention `/qa-add-tests` as an alternative to the full workflow when adding tests
for another requirement, not an extra mandatory step for the same task.

## Closing

Link the current [English quick start](getting-started.md) and [Spanish quick start](getting-started.es.md).
Direct scripts, CI, fixture replay and contributor checks live in the separate
[terminal and maintenance reference](terminal-setup-and-maintenance.md).

## Replay without recording

Follow the quick start inside an actual model session to try the journey. To regenerate the illustrated preview,
see [rendering instructions](media/regenerate-rf101-video-prompt.md). The deterministic `test:e2e-quick` fixture
replay remains developer evidence only, not a recording of the slash-command journey.
See [demo.md](demo.md) and [accessible narration](demo-transcript.md).
