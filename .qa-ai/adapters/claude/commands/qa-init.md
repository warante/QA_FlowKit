---
description: Guided QA AI Starter initialization
argument-hint: [optional init flags]
---

Initialize QA AI Starter from the copied `.qa-ai/` framework folder.

If `$ARGUMENTS` is empty, do not run anything yet. Ask the user these questions first:

1. Which preset should be used?
   - `manual-only`: QA artifact generation only; no automation folders.
   - `webdriverio-playwright-api`: WebdriverIO UI/E2E plus Playwright API folders.
   - `selenium-jest-browserstack`: Selenium/Jest/BrowserStack style folders.
2. Which agent adapters should be generated?
   - Recommend `claude,opencode` when the user wants both.
   - Use `claude` when the repo will only use Claude Code.
   - Use `all` when the user wants every supported adapter.
3. Should existing generated files be overwritten?
   - Recommend `no`; only use `--force` if the user explicitly asks.

After the user answers, build and run:

```bash
node .qa-ai/scripts/init.mjs --preset <preset> --adapters <adapters>
```

Only add `--force` if the user explicitly approved overwriting.

If `$ARGUMENTS` is not empty, treat it as advanced mode and run:

```bash
node .qa-ai/scripts/init.mjs $ARGUMENTS
```

After the command finishes:

1. Summarize what was created, skipped or warned.
2. Run or suggest `node .qa-ai/scripts/doctor.mjs`.
3. Tell the user to restart Claude Code if newly generated slash commands do not appear immediately.
4. Do not write to Jira, Confluence, TestRail or GitHub.
