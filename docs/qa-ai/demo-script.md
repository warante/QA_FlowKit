# RF-101 Demo Recording Script

## Goal

Prepare a two-minute-or-shorter beginner CLI walkthrough of intake, normalize, Gherkin, traceability and PR preparation.
Use real captured output, including a deterministic failure and correction. The preview is a **rendered CLI
walkthrough**, not an OpenCode recording, agent execution or independent human review.
The existing published video remains historical and unchanged until the preview is reviewed.

## Prerequisites

- Node.js 22.18+; Node.js 24 recommended.
- A source checkout with dependencies installed, a local npm tarball and clean isolated targets.
- Python with Pillow and FFmpeg for rendering only, installed outside the repository.
- No credentials, remote tools or model session are needed for fixture replay.

## Recording setup

Capture actual output before composing frames:

```bash
node .github/scripts/capture-onboarding.mjs --output <new-capture.json>
```

The helper installs a locally packed package, not an npm registry release. Displayed `qa-flowkit` is an alias for
that installed Node entrypoint. JSON is explicitly labelled as selected fields; preserve actual diagnostics and
warnings. Quote multiword arguments and remove private paths. Never simulate slash-command or model responses.
Keep the “PREVIEW / rendered CLI / fixture replay” label visible. Do not overwrite published media or captions.

## Scene 1 — Install and configure (0–20 seconds)

Show installation (`qa-flowkit init --no-adapters`) and manual-only quick-track configuration from the capture.
Explain the public equivalent: `npx qa-flowkit`, then `node .qa-ai/scripts/init.mjs --preset manual-only --qa-track quick`.
Show `.qa-ai/qa-ai.config.yaml`, `.qa-ai/output/` and `.qa-ai/features/`, not root-layout defaults.

## Scene 2 — Source and governed phases (20–40 seconds)

Show `requirements/RF-101-login.md`, `run start --rf RF-101`, then captured intake/normalize checks.
Explicitly say the helper copies reviewed fixtures between `run next` and `run check`; no agent generated them here.

## Scene 3 — Approval and intentional failure (40–65 seconds)

Explain that real users review the design first. In this deterministic replay the helper records the fixture's
`test-design` approval. Show the actual `approvals` fields, not invented `ok`/`gate` output.
The invalid fixture lacks `@manual`. Show `run check --json`, `ok: false`, `phaseId: gherkin`, the actual missing-tag
diagnostic and exit code 1.

## Scene 4 — Correct and recheck (65–85 seconds)

The helper replaces the invalid fixture with the corrected version containing `@manual:true`.
Show the captured passing check, then the feature validator warning: the historical fixture is in `functional/`
instead of the recommended `manual/`. Explain that this warning is advisory, not a hidden failure.

## Scene 5 — Traceability and final gate (85–110 seconds)

Show captured traceability/PR checks, completed run status and `validate-target` success.
Paths belong under `.qa-ai/output/` and `.qa-ai/features/`. Completion means local artifact validation, not executed
login tests, a posted GitHub PR or external synchronization.

## Closing (110–115 seconds)

Point to [Getting Started](getting-started.md) and [Terminal Transcripts](terminal-transcripts.md).
Keep modules, hooks, provenance and SARIF in the separate [advanced guide](modernization.md).

## Replay without recording

```bash
npm run test:e2e-quick
node .github/scripts/capture-onboarding.mjs --output <new-capture.json>
```

The E2E and capture use deterministic RF-101 fixtures. Neither is live-host E2E or model-support certification.
See [demo.md](demo.md), [demo-transcript.md](demo-transcript.md) and
[preview generation instructions](media/regenerate-rf101-video-prompt.md).
