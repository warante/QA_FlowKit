---
description: Guided QA AI Starter initialization / Inicialización guiada de QA AI Starter
argument-hint: [optional init flags]
---

Initialize QA AI Starter from the copied `.qa-ai/` framework folder.

If `$ARGUMENTS` is empty, do not run anything yet. Ask the user these questions first. Ask question 1 in both English and Spanish; after the user chooses an interface language, ask the remaining questions in that interface language.

1. Which language should QA AI Starter use for user-facing workflow descriptions and questions? / ¿Qué idioma debe usar QA AI Starter para las descripciones y preguntas del workflow?
   - `en`: English.
   - `es`: Español.
2. Which Gherkin language should generated `.feature` files use?
   - `en`: English Gherkin keywords and `Acceptance Criteria:`.
   - `es`: Spanish Gherkin keywords and `Criterios de aceptación:`.
3. Which base template should be used?
   - `manual-only`: QA artifact generation only; no automation folders.
   - `webdriverio-playwright-api`: WebdriverIO UI/E2E plus Playwright API folders.
   - `selenium-jest-browserstack`: Selenium/Jest/BrowserStack style folders.
4. What is the primary requirements source?
   - Examples: `markdown`, `jira`, `confluence`, `pasted-text`.
5. Which test management tool should be configured?
   - Examples: `none`, `testrail`, `zephyr`, `xray`.
6. Which issue tracker should be configured?
   - Examples: `none`, `jira`, `github`.
7. Should the base template UI/E2E framework be overridden?
   - Examples: `none`, `undecided`, `webdriverio`, `playwright`, `cypress`, `selenium`.
8. Should the base template API/integration framework be overridden?
   - Examples: `none`, `undecided`, `playwright-api`, `postman`, `rest-assured`, `supertest`.
9. Should any generated paths be customized?
   - Optional flags: `--ui-specs-path`, `--ui-page-objects-path`, `--api-specs-path`.
10. Which agent adapters should be generated?
   - Recommend `opencode,claude` when the user wants both.
   - Use `opencode` when the repo will only use OpenCode.
   - Use `all` when the user wants every supported adapter.
11. Should existing generated files be overwritten?
   - Recommend `no`; only use `--force` if the user explicitly asks.

After the user answers, build and run:

```bash
node .qa-ai/scripts/init.mjs --preset <base-template> --interface-language <en|es> --gherkin-language <en|es> --requirements-source <source> --test-management-tool <tool> --issue-tracker <tool> --adapters <adapters>
```

Only add `--ui-framework`, `--api-framework`, path override flags or `--set key=value` when the user asks for custom configuration that differs from the base template. Only add `--force` if the user explicitly approved overwriting.

If `$ARGUMENTS` is not empty, treat it as advanced mode and run:

```bash
node .qa-ai/scripts/init.mjs $ARGUMENTS
```

After the command finishes:

1. Summarize what was created, skipped or warned in the selected interface language.
2. Run or suggest `node .qa-ai/scripts/doctor.mjs`.
3. Tell the user in the selected interface language that QA agents are loaded from `.qa-ai/agents/README.md` and active specialists from `.qa-ai/agents/specialists/active.md`.
4. Tell the user in the selected interface language to restart OpenCode if newly generated slash commands do not appear immediately.
5. Do not write to configured external tools.
