Read `AGENTS.md`, `qa-ai.config.yaml`, `.qa-ai/workflows/command-interaction.md`, `README.md`, `ROADMAP.md`, `docs/qa-ai/implementation-guide-for-codex.md`, `docs/qa-ai/backlog.md` and all files under `.qa-ai/rules/`.

Before the first user-facing response, resolve `project.interfaceLanguage` / `project.defaultLanguage` and keep that language throughout the interaction. Use `request_user_input` for closed choices when the current mode exposes it; otherwise use numbered options with a separate custom choice.

Then implement the QA FlowKit MVP from beginning to end.

Before changing files, provide a concise plan. Do not remove or overwrite existing files unless necessary and clearly justified.

Run the local validation scripts after changes:

```bash
node .qa-ai/scripts/doctor.mjs
npm run validate:oss-extraction
```

For initialized target repositories after real QA artifacts exist, also use `node .qa-ai/scripts/doctor.mjs --strict` and run the feature, traceability, sync-plan and active-specialist validators without source-repo allowances.
Shortcut: `node .qa-ai/scripts/validate-target.mjs`.
