# Gherkin Rules

**Enforced by:** validate-features.mjs, lib/gherkin-validate.mjs

Apply to every `.feature` file under the configured `gherkin.featurePath`.

## Design features vs Karate execution features

When Karate is the automation framework (`automation.api.framework` and/or `automation.ui.framework` is `karate`):

- **This file** applies only to **QA design** features under `gherkin.featurePath` (default `features/`).
- **Executable** Karate tests live under `automation.api.specsPath` / `automation.ui.specsPath` (default `tests/karate/features/...`) and follow [karate.rules.md](karate.rules.md) with `validate-karate-features.mjs`.

Do not mix Karate `* method` steps into design features or QA acceptance blocks into Karate execution features.

## Language

- Use the configured Gherkin language from `qa-ai.config.yaml` (`gherkin.language`): English (`en`) or Spanish (`es`).
- Use English Gherkin keywords and `Acceptance Criteria:` for `en`.
- Use Spanish Gherkin keywords and `Criterios de aceptación:` for `es`.
- Spanish `.feature` files must include `# language: es`.

## Folder layout

- Do **not** place `.feature` files directly in the feature root (e.g. `features/RF-004-TC-001-….feature`).
- Use exactly one type subfolder under `gherkin.featurePath`:

| Subfolder        | When to use                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `functional/`    | Default: `@type:functional`, `regression`, `smoke`, `negative`, `edge-case`, `performance` |
| `integration/`   | `@type:integration`                                                                        |
| `e2e/`           | `@type:e2e`                                                                                |
| `api/`           | `@type:api` or tag `@api` (API behaviour at design level)                                  |
| `accessibility/` | `@type:accessibility` or `a11y`                                                            |
| `security/`      | `@type:security`                                                                           |
| `manual/`        | `@manual:true` (manual-only execution)                                                     |

- Init creates only the feature root; subfolders appear when the first file is written for that type.
- Misplaced root files: `node .qa-ai/scripts/organize-features.mjs` (or `--dry-run` first).

**Path pattern:** `features/<subfolder>/<RF-ID>-TC-<N>-<short-description>.feature`

## Structure

- One `.feature` file per test case.
- One configured scenario keyword per `.feature` file: `Scenario:` / `Scenario Outline:` for English or `Escenario:` / `Esquema del escenario:` for Spanish.
- Include the configured acceptance criteria section after the Feature narrative.
- Manual tests also require `.feature` files.
- Unit tests are excluded.

## Tags

- **Required:** `@priority:`, `@type:`, `@manual:` (values from `gherkin.tags` in config when present).
- **Recommended:** `@rf:` (requirement ID), `@id:` (test case ID for matrices and deduplication).

## Traceability

- RF traceability: use `@rf:RF-xxx` and/or an RF-like ID in the filename and Scenario title.
- The **Feature title** may be a clean, human-readable name without embedding the RF ID.
- Do not generate final features until the official RF ID is confirmed ([requirements.rules.md](requirements.rules.md)).

## Scenario types and specialists

When `@type:` indicates specialized testing, also read the matching specialist under `.qa-ai/agents/specialists/available/` even if it is not listed in `active.md`:

| `@type:` value (examples)       | Specialist file    |
| ------------------------------- | ------------------ |
| `accessibility`, `a11y`         | `accessibility.md` |
| `performance`, `load`, `stress` | `performance.md`   |
| `security`                      | `security.md`      |

UI, API and mobile implementation still follow [ui-automation.rules.md](ui-automation.rules.md), [api-testing.rules.md](api-testing.rules.md) and the active Appium/WebdriverIO/Playwright specialists.

## Validation

```bash
node .qa-ai/scripts/validate-features.mjs
```
