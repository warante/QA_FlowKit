# Karate Rules

**Enforced by:** validate-karate-features.mjs (executable features under automation api/ui specsPath when framework is karate)

Apply when `automation.api.framework` and/or `automation.ui.framework` is `karate`.

## Two Gherkin worlds

| Location                                    | Purpose                              | Validator                      |
| ------------------------------------------- | ------------------------------------ | ------------------------------ |
| `gherkin.featurePath` (default `features/`) | QA design, traceability, manual tags | `validate-features.mjs`        |
| `tests/karate/features/...`                 | Executable Karate API/UI tests       | `validate-karate-features.mjs` |

Do not put Karate `* url` / `method` steps in design features. Do not require QA `Acceptance Criteria:` blocks in Karate execution features.

## Karate feature conventions

- Use `Feature:` and one or more `Scenario` / `Scenario Outline` blocks.
- Prefer Karate `*` steps over Cucumber `Given`/`When`/`Then` glue.
- API scenarios: include `url`/`path`, `method`, `status`, and `match` as appropriate.
- UI scenarios: use Karate UI keywords (`driver`, `click`, `input`, etc.) under `tests/karate/features/ui/`.
- Reuse `Background` for shared setup; use `karate-config.js` for environments (never hardcode secrets).
- Recommended tags: `@rf:`, `@id:`, `@smoke` for traceability (optional unless `--strict-rf`).

## Mocks and performance

- Service mocks: document under `automation.karate.mocksPath` (proposal-first).
- Gatling/load tests: `automation.karate.performancePath` may contain non-`.feature` assets; not validated by `validate-karate-features.mjs`.

## Constraints

- Do not change `karate-config.js`, `pom.xml`, or `build.gradle` without approval.
- Do not add Java dependencies without approval.
- Reference [Karate documentation](https://docs.karatelabs.io/getting-started/why-karate) for DSL details.
