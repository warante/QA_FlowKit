---
description: Guided QA FlowKit initialization / Inicializacion guiada de QA FlowKit
argument-hint: [optional init flags]
---

Initialize QA FlowKit from the copied `.qa-ai/` framework folder.

If the user already has an exported configuration profile from another repository with the same structure, suggest `/qa-config --import <profile-path>` instead of repeating guided init.

If the user provides `--qa-context <path>` or says they have a folder describing how QA works, load `.qa-ai/workflows/context-intake.md` and `.qa-ai/agents/qa-context-intake-agent.md` before choosing init defaults. Read the repository-local QA context folder, summarize explicit versus inferred practices, propose init flags, and ask for approval before running `init.mjs`.

If `$ARGUMENTS` is empty, do not run anything yet. Ask the user these questions first. Ask question 1 in both English and Spanish; after the user chooses an interface language, ask the remaining questions in that interface language.

1. Which language should QA FlowKit use for user-facing workflow descriptions and questions? / Que idioma debe usar QA FlowKit para las descripciones y preguntas del workflow?
   - `en`: English.
   - `es`: Espanol.
2. Do you have a repository-local folder that documents how the QA team works?
   - If yes, ask for the path, for example `qa-ai-knowledge`, then run the QA context intake workflow before continuing.
   - If no, continue with standard guided init.
3. Which Gherkin language should generated `.feature` files use?
   - `en`: English Gherkin keywords and `Acceptance Criteria:`.
   - `es`: Spanish Gherkin keywords and `Criterios de aceptacion:`.
4. Which base template should be used?
   - `manual-only`: QA artifact generation only; no automation folders.
   - `webdriverio-playwright-api`: WebdriverIO UI/E2E plus Playwright API folders.
   - `selenium-jest-browserstack`: Selenium/Jest/BrowserStack style folders.
5. What is the primary requirements source?
   - Examples: `markdown`, `jira`, `confluence`, `pasted-text`.
6. Which test management tool should be configured?
   - Examples: `none`, `testrail`, `zephyr`, `xray`.
7. Which issue tracker should be configured?
   - Examples: `none`, `jira`, `github`.
8. Should the base template UI/E2E framework be overridden?
   - Examples: `none`, `undecided`, `webdriverio`, `playwright`, `cypress`, `selenium`.
9. Should the base template API/integration framework be overridden?
   - Examples: `none`, `undecided`, `playwright-api`, `postman`, `rest-assured`, `karate`.
10. Should any generated paths be customized?

- Optional flags: `--ui-specs-path`, `--ui-page-objects-path`, `--api-specs-path`.

11. Which agent adapters should be generated?

- Recommend `opencode,claude` when the user wants both.
- Use `opencode` when the repo will only use OpenCode.
- Use `all` when the user wants every supported adapter.

12. Should existing generated files be overwritten?

- Recommend `no`; only use `--force` if the user explicitly asks.

After the user answers, build and run:

```bash
node .qa-ai/scripts/init.mjs --preset <base-template> --interface-language <en|es> --gherkin-language <en|es> --requirements-source <source> --test-management-tool <tool> --issue-tracker <tool> --adapters <adapters>
```

Add `--qa-context <path>` when a QA context folder was approved. Only add `--ui-framework`, `--api-framework`, path override flags or `--set key=value` when the user asks for custom configuration that differs from the base template or the approved QA context recommendation. Only add `--force` if the user explicitly approved overwriting.

If `$ARGUMENTS` is not empty, treat it as advanced mode and run:

```bash
node .qa-ai/scripts/init.mjs $ARGUMENTS
```

Exception: when `$ARGUMENTS` includes `--qa-context`, read that context first and present the proposed defaults. Treat explicit flags in `$ARGUMENTS` as user-approved overrides, then run the final command after confirming any inferred choices.

After the command finishes:

1. Summarize what was created, skipped or warned in the selected interface language.
2. Run or suggest `node .qa-ai/scripts/doctor.mjs`.
3. Explain that source-repo maintainers can run `npm run validate:oss-extraction`, while target repositories should run `node .qa-ai/scripts/validate-target.mjs` after real QA artifacts exist.
4. If QA context was used, write or update `qa-ai-output/qa-knowledge-summary.md` and `qa-ai-output/qa-init-decisions.md` unless the user declined artifact writes.
5. Tell the user in the selected interface language that QA agents are loaded from `.qa-ai/agents/README.md`, active specialists from `.qa-ai/agents/specialists/active.md`, and QA context artifacts from `knowledge.summaryPath` / `knowledge.decisionsPath` when enabled.
6. Tell the user in the selected interface language to restart OpenCode if newly generated slash commands do not appear immediately.
7. Do not write to configured external tools.
