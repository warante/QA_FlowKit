Read `AGENTS.md`, `README.md`, `ROADMAP.md`, `docs/qa-ai/implementation-guide-for-codex.md`, `docs/qa-ai/backlog.md` and all files under `.qa-ai/rules/`.

Then implement the QA AI Starter MVP from beginning to end.

Before changing files, provide a concise plan. Do not remove or overwrite existing files unless necessary and clearly justified.

Run the local validation scripts after changes:

```bash
node .qa-ai/scripts/doctor.mjs
npm run validate:oss-extraction
```

For initialized target repositories after real QA artifacts exist, also use `node .qa-ai/scripts/doctor.mjs --strict` and run the feature, traceability, sync-plan and active-specialist validators without source-repo allowances.
Shortcut: `node .qa-ai/scripts/validate-target.mjs`.
