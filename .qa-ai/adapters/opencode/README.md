# OpenCode Adapter

Use this folder as an instruction bridge for OpenCode or other terminal coding agents.

Primary files to read:

- `AGENTS.md`
- `qa-ai.config.yaml`
- `.qa-ai/rules/`
- `.qa-ai/workflows/`

Slash commands:

```text
/qa-init
/qa-full-flow
/qa-doctor
/qa-clean
/qa-validate-features
```

Run local checks:

```bash
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/validate-features.mjs
node .qa-ai/scripts/clean.mjs
```

Use `.qa-ai/workflows/full-flow.md` for end-to-end QA delivery and keep all external writes proposal-first.
