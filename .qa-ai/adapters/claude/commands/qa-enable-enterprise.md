---
description: Enable enterprise governance on standard track / Activar gobierno enterprise sobre standard
argument-hint: [optional note for qa-init-decisions]
allowed-tools: [view_file, write_file, edit_file, list_dir, grep_search, glob, run_command]
---

!`node .qa-ai/scripts/show-config.mjs --json`

Before any other action or user-facing text, read and follow `.qa-ai/workflows/command-interaction.md`.

Enable **enterprise governance mode** on an initialized repository. This is not a separate init template: it sets
`project.qaTrack: enterprise` in the active project config (`configPath` from `show-config --json`) on top of the existing **standard** workflow (full test design,
automation planning and PR flow), adding release-gate validation and stricter target checks.

Read these files first:

- `AGENTS.md`
- Resolved config from the injected `show-config --json` output (`configPath`, `qaTrack`, `interfaceLanguage`)
- `.qa-ai/rules/release-gate.rules.md`
- `.qa-ai/workflows/release-gate.md`
- `docs/qa-ai/release-gate.md` when present in the repository

Use `interfaceLanguage` from the resolved `show-config --json` output for user-facing text.

If `ok` is false, tell the user to run `/qa-init` first. Do not create config from scratch.

If `$ARGUMENTS` is empty, ask the user:

1. Confirm they want to enable enterprise governance on this repository.
   - Explain that this keeps the **standard** workflow depth and adds `/qa-gate`, `validate-release-gate.mjs` and
     release-gate checks inside `validate-target.mjs`.
   - Explain this does **not** replace init or change automation presets; it only updates `project.qaTrack`.
2. If the current track is `quick`, warn that enterprise governance expects the **standard** workflow. Recommend
   switching to `standard` first unless the team explicitly accepts enabling governance on a quick-track repository.
3. Ask for explicit approval before editing the active config file (`configPath` from `show-config --json`).

When approved:

1. Read the current `project.qaTrack` value.
2. If already `enterprise`, summarize what is enabled and suggest `/qa-status` and `/qa-help` instead of rewriting config.
3. Otherwise set `project.qaTrack` to `enterprise` in the active config file (`configPath` from `show-config --json`; preserve all other keys).
4. Optionally append a short note to `qa-ai-output/qa-init-decisions.md` when that file exists, recording the governance
   enablement date and `$ARGUMENTS` when provided.

After updating config, tell the user:

- Run `node .qa-ai/scripts/doctor.mjs` or `/qa-doctor`.
- Use `/qa-help` for the next workflow step; new runs should use `npx qa-flowkit run start` so the harness picks up the
  track (existing active runs keep the track they started with).
- When the workflow is complete, record the release decision with `/qa-gate` and run
  `node .qa-ai/scripts/validate-target.mjs`.

Do not write to external tools. Do not run `/qa-gate` automatically; governance enablement is separate from the gate
decision.
