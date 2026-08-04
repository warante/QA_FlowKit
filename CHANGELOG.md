# Changelog

## Unreleased

### Fixed

- Resolved npm audit high-severity vulnerabilities in transitive dependencies (brace-expansion, fast-uri) via `npm audit fix`.

### Added

- A complete implementation roadmap from the current beta to `1.0.0`, with epics, tasks, subtasks, owners,
  dependencies, acceptance criteria, documentation work, E2E checks, CI gates and a reviewed execution order.
- Four self-contained public references covering manual QA, Playwright UI and API, Karate, and Maestro with Karate
  for mobile/API workflows.
- `playwright-full` and `maestro-karate-mobile` presets, plus Maestro rules, specialist guidance, configuration
  support and deterministic flow validation.
- Packed-install E2E runners for the quick path and every public example, including a real Playwright browser run
  and structural Karate/Maestro validation.
- An example compatibility manifest and scheduled/manual CI workflow for validating local and published beta
  channels.
- Automated documentation consistency checks for versions, maturity claims, audit policy, canonical validation
  commands and local Markdown links.
- A public-contract inventory covering CLI commands, run subcommands, configuration, generated paths, state,
  artifacts and deprecated aliases, with an automated drift check.
- Pilot methodology, consent-aware templates, anonymized record validation and metrics analysis tooling. Additional
  external pilots remain intentionally deferred.
- A concise product demo, CLI reference, public-contract guide and expanded example documentation.

### Changed

- The English and Spanish READMEs now lead with the product problem, a five-minute quick path, a compact workflow
  explanation, example choices and explicit limitations.
- CI now validates documentation, contracts, the quick path, packed examples, compatibility channels and supported
  framework runtimes in addition to the existing OS and Node.js matrix.
- Initialization, doctor, target validation, npm packing and smoke coverage now include the new contracts, presets,
  mobile automation paths and example assets.
- Agent adapters and command templates now expose clearer command routing, framework-specific paths, prerequisite
  loading and generated-file ownership.
- The workflow contract, rules and specialist guidance now support Playwright-only UI/API references and
  Maestro-plus-Karate mobile projects without removing the deprecated WebdriverIO compatibility preset.
- Product maturity, security boundaries, npm audit threshold, support claims and release responsibilities are now
  consistent across evergreen documentation.
- The beta-to-`1.0.0` roadmap now treats external pilot execution as deferred while contract stabilization and
  packaging work continue.

### Fixed

- Validation no longer treats ordinary path or prose fragments as test identifiers.
- Cross-platform smoke and npm-pack checks now account for generated adapters and framework-specific example paths.
- Documentation drift and missing packaged contract files now fail validation before release.

## [1.0.0-rc.10](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.9...v1.0.0-rc.10) (2026-07-13)


### Fixed

* **ci:** pin npm for Node 20 publishing ([#94](https://github.com/warante/QA_FlowKit/issues/94)) ([a4971d6](https://github.com/warante/QA_FlowKit/commit/a4971d6cc9ae564ad1fcd998163ce187e8a53654))

## [1.0.0-rc.9](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.8...v1.0.0-rc.9) (2026-07-13)


### Added

* contrato de orientación de agentes, validador y tests ([#93](https://github.com/warante/QA_FlowKit/issues/93)) ([690f663](https://github.com/warante/QA_FlowKit/commit/690f6639b38a24f811cc6989419b05748a25b524))


### Fixed

* agregar delay entre reintentos de npm registry en post-publish validation ([#87](https://github.com/warante/QA_FlowKit/issues/87)) ([ec045e5](https://github.com/warante/QA_FlowKit/commit/ec045e5d71e402bbd48febad63404b4e3ad5c3d2))
* endurecer CI contra inyección usando variables de entorno en lugar de interpolación en shell ([#89](https://github.com/warante/QA_FlowKit/issues/89)) ([26a95dc](https://github.com/warante/QA_FlowKit/commit/26a95dce5c85c4f75deffb621341c545a7d7eb10))


### Changed

* renombrar specialists, agentes y limpiar artefactos legacy ([#90](https://github.com/warante/QA_FlowKit/issues/90)) ([0f4b83c](https://github.com/warante/QA_FlowKit/commit/0f4b83c94dc829b0977bf6460d334bb5a7c4b204))

## [1.0.0-rc.8](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.7...v1.0.0-rc.8) (2026-07-08)


### Added

* flujo QA end-to-end completo - riesgo, datos, entornos, ejecucion, analisis y aprendizaje ([#86](https://github.com/warante/QA_FlowKit/issues/86)) ([b229360](https://github.com/warante/QA_FlowKit/commit/b229360515496ae4c79857d4a713d49791b19c52))


### Documentation

* agregar demo grabado RF-101 y actualizar assets del sitio ([#84](https://github.com/warante/QA_FlowKit/issues/84)) ([403b66d](https://github.com/warante/QA_FlowKit/commit/403b66d5a00a76f20e28790a4335df4da3484026))

## [1.0.0-rc.7](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.6...v1.0.0-rc.7) (2026-07-02)


### Added

* simplify framework installation flow ([#78](https://github.com/warante/QA_FlowKit/issues/78)) ([2671490](https://github.com/warante/QA_FlowKit/commit/26714902f571c27fd32e2ffec44147bfaa969840))

## [1.0.0-rc.6](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.5...v1.0.0-rc.6) (2026-07-01)


### Fixed

* resolver idioma de interfaz desde config compacta ([#76](https://github.com/warante/QA_FlowKit/issues/76)) ([a999653](https://github.com/warante/QA_FlowKit/commit/a99965314ce339577e2c4c25d096e2f495f78df6))

## [1.0.0-rc.5](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.4...v1.0.0-rc.5) (2026-06-30)


### Added

* adopt compact layout as default target repository structure ([#75](https://github.com/warante/QA_FlowKit/issues/75)) ([9292d34](https://github.com/warante/QA_FlowKit/commit/9292d345cd0705af49c20a65b10e42800432a19a))
* ampliar especialistas de estrategia y enrutado inteligente ([#72](https://github.com/warante/QA_FlowKit/issues/72)) ([733e9bd](https://github.com/warante/QA_FlowKit/commit/733e9bda02e34e553ecd35977873f57fdc34e2d4))
* segunda iteración de enrutado de especialistas QA ([#74](https://github.com/warante/QA_FlowKit/issues/74)) ([9222d0d](https://github.com/warante/QA_FlowKit/commit/9222d0dd8f6c9feff0508935367bff98afd55f85))

## [1.0.0-rc.4](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.3...v1.0.0-rc.4) (2026-06-30)


### Changed

* cerrar gaps técnicos en utilidades, validadores, monolitos y docs ([#69](https://github.com/warante/QA_FlowKit/issues/69)) ([f332fce](https://github.com/warante/QA_FlowKit/commit/f332fcebb01cfd326ab694093c1e39d8ac78e78d))
* **ci:** split validate:oss-extraction into core and e2e suites ([#66](https://github.com/warante/QA_FlowKit/issues/66)) ([25824bd](https://github.com/warante/QA_FlowKit/commit/25824bdc8813fcf7f8263863a48b151770753593))
* consolidar validadores, optimizar CI y cerrar plan de revision profunda ([#71](https://github.com/warante/QA_FlowKit/issues/71)) ([c90333a](https://github.com/warante/QA_FlowKit/commit/c90333a527687aec73891fe868f38cc84eaa0a51))
* dedupe framework libs, CI scripts, and test harness ([#68](https://github.com/warante/QA_FlowKit/issues/68)) ([df12dc8](https://github.com/warante/QA_FlowKit/commit/df12dc82fffbbf083800a479567f67f4d1b0bf2c))
* implementar revision profunda de arquitectura QA FlowKit ([#70](https://github.com/warante/QA_FlowKit/issues/70)) ([edc565f](https://github.com/warante/QA_FlowKit/commit/edc565fa9ebe2980a1c94abafc1ba647e3eebe8d))
* unify CI helpers and validator registry ([#67](https://github.com/warante/QA_FlowKit/issues/67)) ([3888f30](https://github.com/warante/QA_FlowKit/commit/3888f30a4890fb1b22c089700d75965a38b83a2c))


### Documentation

* align lifecycle claims and defaults with RC channel ([#64](https://github.com/warante/QA_FlowKit/issues/64)) ([6c7fd5d](https://github.com/warante/QA_FlowKit/commit/6c7fd5d1ab7b6e747e7c72a6c2457d325edadcb8))

## [1.0.0-rc.3](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.2...v1.0.0-rc.3) (2026-06-29)


### Fixed

* corregir invocación de npm en Windows en validación de canales de ejemplo ([#62](https://github.com/warante/QA_FlowKit/issues/62)) ([fe3434c](https://github.com/warante/QA_FlowKit/commit/fe3434cbb5e598e80037140c4086fff03c55b6e6))

## [1.0.0-rc.2](https://github.com/warante/QA_FlowKit/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2026-06-28)


### Added

* agente UI genérico, comando enterprise y endurecimiento de validadores ([#58](https://github.com/warante/QA_FlowKit/issues/58)) ([e65f708](https://github.com/warante/QA_FlowKit/commit/e65f708ef81a9f0c4b48c5b6214fecf14974bfa2))


### Documentation

* add multilingual product landing page ([9fe19cc](https://github.com/warante/QA_FlowKit/commit/9fe19cc452206b14284651d313779fedff24afaa))
* expand landing command reference ([f960a6c](https://github.com/warante/QA_FlowKit/commit/f960a6cdc2f2a8259eb99265fe81246cd430ea5a))
* expand multilingual product landing page ([35e105c](https://github.com/warante/QA_FlowKit/commit/35e105c7ade2a4892ae65df5921fc5d77ffa35dc))
* refine multilingual landing experience ([ef54233](https://github.com/warante/QA_FlowKit/commit/ef542339067cd9fb20e178a0f728e924da07a3d8))

## [1.0.0-rc.1](https://github.com/warante/QA_FlowKit/compare/v0.5.9-beta.0...v1.0.0-rc.1) (2026-06-26)


### Changed

* force first rc release please version ([#55](https://github.com/warante/QA_FlowKit/issues/55)) ([d1b7376](https://github.com/warante/QA_FlowKit/commit/d1b73762781cc041731df40de55f3928e7f3c2f6))
* transition release-please to RC channel (TASK-080) ([#51](https://github.com/warante/QA_FlowKit/issues/51)) ([b973615](https://github.com/warante/QA_FlowKit/commit/b9736159a6d2e7a4c518f5eeaa72ee2ecd974297))

## [0.5.9-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.8-beta.0...v0.5.9-beta.0) (2026-06-26)


### Added

* automatización de readiness 1.0 y endurecimiento de contratos ([#41](https://github.com/warante/QA_FlowKit/issues/41)) ([400a050](https://github.com/warante/QA_FlowKit/commit/400a050ccd099ba14974290ce98081cd93d1111a))


### Fixed

* keep release-managed adapter support out of prettier ([#45](https://github.com/warante/QA_FlowKit/issues/45)) ([8d2ee23](https://github.com/warante/QA_FlowKit/commit/8d2ee23ebdec1a735808d3e6b63381f98345b5f7))
* keep release-managed manifests versioned ([#47](https://github.com/warante/QA_FlowKit/issues/47)) ([b31d16b](https://github.com/warante/QA_FlowKit/commit/b31d16b5b8a9f7db0efcbc71002306f90c1903e2))
* version release validation artifacts ([#43](https://github.com/warante/QA_FlowKit/issues/43)) ([94bb65b](https://github.com/warante/QA_FlowKit/commit/94bb65bbb221b3aad06a6c87742aaef3b617ddc2))


### Changed

* ignore release-managed json formatting ([#49](https://github.com/warante/QA_FlowKit/issues/49)) ([320ba29](https://github.com/warante/QA_FlowKit/commit/320ba297f23fc50e6563c61ed3913c92fd0f716d))

## [0.5.8-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.7-beta.0...v0.5.8-beta.0) (2026-06-24)


### Added

* add verifiable semantic test coverage ([#39](https://github.com/warante/QA_FlowKit/issues/39)) ([133be92](https://github.com/warante/QA_FlowKit/commit/133be9296eeaeabc2548a49443b585c3de3058f0))

## [0.5.7-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.6-beta.0...v0.5.7-beta.0) (2026-06-23)


### Added

* add traceable non-functional requirement coverage ([#37](https://github.com/warante/QA_FlowKit/issues/37)) ([28878ea](https://github.com/warante/QA_FlowKit/commit/28878ea4d643e721d4f17f98d19b28fed4fc3960))

## [0.5.6-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.5-beta.0...v0.5.6-beta.0) (2026-06-19)


### Documentation

* simplify agent-first onboarding ([#33](https://github.com/warante/QA_FlowKit/issues/33)) ([6f0892b](https://github.com/warante/QA_FlowKit/commit/6f0892b049a401d54a35c4cc8303b184c7d75351))

## [0.5.5-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.4-beta.0...v0.5.5-beta.0) (2026-06-19)


### Added

* complete QA FlowKit improvement plan ([#28](https://github.com/warante/QA_FlowKit/issues/28)) ([74d7522](https://github.com/warante/QA_FlowKit/commit/74d75224d1352df7f56465b5aa6c651227a87fb6))


### Fixed

* resolve js-yaml audit advisory ([#26](https://github.com/warante/QA_FlowKit/issues/26)) ([15b58cc](https://github.com/warante/QA_FlowKit/commit/15b58cc1b994c8101fcff6febd50e9837ee2d234))
* sync claude plugin release versions ([#31](https://github.com/warante/QA_FlowKit/issues/31)) ([0ee3679](https://github.com/warante/QA_FlowKit/commit/0ee36795a0147a43693d75e08f61efe2f0534210))

## [0.5.4-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.3-beta.0...v0.5.4-beta.0) (2026-06-11)


### Added

* diseño de pruebas avanzado con validador de cobertura ([#19](https://github.com/warante/QA_FlowKit/issues/19)) ([cfe47ee](https://github.com/warante/QA_FlowKit/commit/cfe47eee54679aabb1e6262e05512efd143e5d77))

## [0.5.3-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.2-beta.0...v0.5.3-beta.0) (2026-06-09)


### Added

* add v1 roadmap and validated public examples ([#16](https://github.com/warante/QA_FlowKit/issues/16)) ([517f87e](https://github.com/warante/QA_FlowKit/commit/517f87e6f93490c0a76b8301936127b778a12cb2))

## [0.5.2-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.1-beta.0...v0.5.2-beta.0) (2026-06-06)


### Added

* add repository-native agent harness ([#15](https://github.com/warante/QA_FlowKit/issues/15)) ([4aeb743](https://github.com/warante/QA_FlowKit/commit/4aeb7436ac2a2503ac8ca212491eb5994f21a4b0))


### Changed

* **release:** reintentar verificacion post-publish por latencia de npm ([56f9704](https://github.com/warante/QA_FlowKit/commit/56f9704e298246b3d56af98d032f8cbafbb07bac))

## [0.5.1-beta.0](https://github.com/warante/QA_FlowKit/compare/v0.5.0-beta.0...v0.5.1-beta.0) (2026-05-30)


### Added

* actualizar adaptadores para bootstrap agent-first y comandos qa-init ([b7c4a27](https://github.com/warante/QA_FlowKit/commit/b7c4a2759ca529a19eb045166fd2130212575fea))
* **beta:** v0.5.0-beta.0 — validadores, reglas modulares, CI, Karate y release npm ([#12](https://github.com/warante/QA_FlowKit/issues/12)) ([18d1b16](https://github.com/warante/QA_FlowKit/commit/18d1b16590d1db9013c67b240da9973f6fc7c18b))
* CLI npm qa-flowkit, rebrand QA FlowKit y README.es UTF-8 ([#10](https://github.com/warante/QA_FlowKit/issues/10)) ([92ca975](https://github.com/warante/QA_FlowKit/commit/92ca97517f55d4c43680ea4f437031a9f654b09b))
* initial open-source QA AI starter (v0.1.0) ([726eeb4](https://github.com/warante/QA_FlowKit/commit/726eeb4511b7cec80082a959d8d2201604f04a29))
* mejorar init, validacion, especialistas y smoke-test del framework QA AI ([16abc74](https://github.com/warante/QA_FlowKit/commit/16abc74dffc1ac8968518d2fc314f70611813cec))
* **qa-ai:** ampliar agentes de fase, especialistas y context intake ([31b8435](https://github.com/warante/QA_FlowKit/commit/31b8435891d56e330475b2a7633275e3606bafd3))
* **qa-ai:** context intake, agentes ampliados y adaptadores Claude/OpenCode/Gemini ([cd0f5fd](https://github.com/warante/QA_FlowKit/commit/cd0f5fdb80904b5b524955938c5c7bd51517f34a))
* **qa-ai:** extender adaptadores Claude, OpenCode y Gemini ([becf31c](https://github.com/warante/QA_FlowKit/commit/becf31c1083b0253a42858f61a24c2a66da606be))
* **qa-ai:** refactor init y anadir utilidades de configuracion ([eebfca9](https://github.com/warante/QA_FlowKit/commit/eebfca96991a527de8703df44b142dd3a1d82824))
* stronger validators and early product docs ([#7](https://github.com/warante/QA_FlowKit/issues/7)) ([c1e0fa4](https://github.com/warante/QA_FlowKit/commit/c1e0fa4725913b652ae4102306818883c6ce820c))
* stronger validators, target-repo hardening and Phase 3 guided docs ([#8](https://github.com/warante/QA_FlowKit/issues/8)) ([e26482c](https://github.com/warante/QA_FlowKit/commit/e26482caebf23d12d60b474a170f86d7abfe3a5e))
* tramos QA, qa-help, release gate y test design dual-mode ([#9](https://github.com/warante/QA_FlowKit/issues/9)) ([59d23fa](https://github.com/warante/QA_FlowKit/commit/59d23fa2a2c00b38788facf72de3ee944e4513dd))


### Fixed

* **ci:** pasar rutas .release-please-config al CLI ([039fa25](https://github.com/warante/QA_FlowKit/commit/039fa25673de1d288864b2372e0cc3dc5cc1d488))
* **ci:** release-please via CLI por politica de Actions ([68c2f37](https://github.com/warante/QA_FlowKit/commit/68c2f375ff8cbc786c92e78567c6bbf881f36358))
* escape YAML override regex keys ([0f786b6](https://github.com/warante/QA_FlowKit/commit/0f786b6c24476b76e7d6113a874c576d615c2d84))


### Changed

* configure CodeQL source paths ([ff2545c](https://github.com/warante/QA_FlowKit/commit/ff2545c8eb3093383b7a711be831b150a76a4852))
* usar qa-ai-output para artefactos y ajustar init por defecto ([b40f3ff](https://github.com/warante/QA_FlowKit/commit/b40f3fff35b7d93522e8a92514d5842a5306a669))


### Documentation

* actualizar README, AGENTS.md y documentacion del workflow QA AI ([909e487](https://github.com/warante/QA_FlowKit/commit/909e48757376fb11fba64a27543282f7e3bbe27c))
* **ci:** aclarar permiso de Actions para abrir Release PR ([2a2e305](https://github.com/warante/QA_FlowKit/commit/2a2e305d46e3df2a9d536620eabad30e89c88b87))
* document CI badge and local validation for contributors ([0e34597](https://github.com/warante/QA_FlowKit/commit/0e34597378dbff4246ecc59d51e887502e106d6a))
* README bilingue y actualizacion de documentacion del workflow QA AI ([9012708](https://github.com/warante/QA_FlowKit/commit/9012708db9f85848befe8861d97e7916b6829f0e))
* renombrar preset a plantilla base y documentar opciones de init ([4ce113c](https://github.com/warante/QA_FlowKit/commit/4ce113ce060244296797d0be0ebba7409506f44d))

## 0.4.0-alpha.0 - npm CLI

### Added

- npm CLI package identity `qa-flowkit@0.4.0-alpha.0` with `npx qa-flowkit init`.
- `bin/qa-flowkit.mjs` with `init`, `update`, `doctor`, `validate-target`, `validate-features`, `sync-adapters`, `help` and `clean`.
- npm pack/install smoke coverage for CLI install, safe init refusal, update preservation and package file allowlist.
- Explicit npm package `files` allowlist to avoid publishing root adapters, GitHub metadata, caches or target-repository artifacts.
- `qa-help.mjs` and `qa-next-steps.mjs` for context-aware next-step guidance (BMAD-inspired).
- `project.qaTrack` (`quick`, `standard`, `enterprise`) in presets and `init.mjs --qa-track`.
- `/qa-help` slash commands for Claude Code and OpenCode adapters.
- Release quality gate (`release-gate.yaml`, `validate-release-gate.mjs`, `/qa-gate`) with PASS/CONCERNS/FAIL/WAIVED decisions for enterprise track.
- Dual-mode test design: system-level `test-design-system.md`, per-RF proposal, `validate-test-design.mjs` and `testDesign.*` config paths.
- `doctor.mjs --strict` for initialized target repositories and CI hardening.
- `validate-target.mjs` aggregated target-repository validation command.
- Shared Markdown table parsing utilities for stronger validators.
- Native Node unit tests for shared validator helpers.
- Documented test-management mapping template.
- Stronger traceability matrix validation for Markdown table shape, duplicate test case identifiers and duplicate feature file rows.
- Stronger test-management sync plan validation for Markdown table shape, proposal-first rows, approval status and duplicate identifiers.
- Stronger test-management mapping validation for entry shape, duplicate external IDs and secret-like values.
- Smoke coverage for strict doctor success and failure paths.

### Documentation

- Added `docs/qa-ai/qa-help.md`, `release-gate.md` and `test-design-dual-mode.md`.
- Framework upgrade guide in `README.md` and `README.es.md`.
- Documented target-repository hardening status and strict doctor usage in README, roadmap, architecture and backlog.
- Aligned Claude, OpenCode, Codex and generic adapter validation guidance with the hardened validator pipeline.

## 0.3.0 - Context intake y agentes ampliados

Release tras el merge de [#2](https://github.com/warante/QA_FlowKit/pull/2). Enfoque: carpeta de contexto QA del equipo, init/config refactorizados, agentes más accionables y más comandos `/qa-*` en adaptadores agent-first.

### Added

- Agente `qa-context-intake-agent` y workflow `context-intake.md` para prácticas QA locales en una carpeta del repo.
- Scripts `config.mjs` y `lib/project-config.mjs`; comando npm `qa:config`.
- Adaptador **Gemini CLI** (`GEMINI.md` en plantillas).
- Comandos `/qa-*` ampliados en plantillas y salidas **Claude Code** y **OpenCode** (`qa-config`, `qa-status`, `qa-coverage`, `qa-add-tests`, `qa-update-tests`, `qa-automation-plan`, `qa-full-flow`, etc.).
- Documentación de carpeta de contexto QA en README (EN/ES).

### Changed

- `init.mjs` simplificado y alineado con presets y lectura de contexto del proyecto.
- Agentes de fase y especialistas (`available/*`) con guías operativas más detalladas.
- `doctor.mjs` y `smoke-test.mjs` validan el nuevo flujo y utilidades de configuración.
- Presets actualizados con soporte de carpeta de contexto.

### Documentation

- `README.md` / `README.es.md`: agent-first bootstrap, context folder y comandos.
- `docs/qa-ai/*`: arquitectura, workflow, compatibilidad de agentes y backlog.

## 0.2.0 - Workflow enhancements

Major update after the first community release. Focus: agent-first bootstrap, specialist agents, stronger validation and clearer init defaults.

### Added

- Specialist agent catalog under `.qa-ai/agents/specialists/available/` (WebdriverIO, Playwright UI/API, Cypress, Selenium, TestRail, Jira, Karate, Postman, Rest Assured, Appium and generic test design).
- Agent loading protocol in `.qa-ai/agents/README.md`.
- OSS smoke test script (`.qa-ai/scripts/smoke-test.mjs`) and `npm run qa:smoke` / `validate:oss-extraction`.
- Bilingual documentation: `README.es.md`.
- Init options reference in README (EN/ES): base templates, languages, adapters and advanced overrides.
- `.gitattributes` for consistent LF line endings.

### Changed

- **Breaking:** workflow artifacts now go to `qa-ai-output/` instead of `docs/qa/` (agents, workflows, adapters, presets and templates updated).
- `init.mjs` runs with sensible defaults and no flags; adapters are optional via `--adapters` or bootstrap scripts.
- Presets are documented as **base templates** (`--preset` kept for CLI compatibility).
- `doctor.mjs` validates specialists, smoke-test script and expanded framework checks.
- `validate-features.mjs` with stronger Gherkin convention checks.
- Claude Code and OpenCode `/qa-init`, `/qa-full-flow` and `/qa-clean` commands aligned with agent-first flow and new output paths.
- Generic `AGENTS.md` adapter reflects minimal default init vs optional adapter outputs.

### Documentation

- Restructured `README.md` with table of contents, quick start and agent-first bootstrap.
- Updated `docs/qa-ai/*` (architecture, workflow, agent compatibility, implementation guide, backlog, cleanup).

## 0.1.0 - MVP starter

Initial open-source starter package.

Included:

- Portable `.qa-ai/` folder.
- Preset-aware init, doctor, feature validation and adapter sync scripts.
- Manifest-based clean script with dry-run default and hash protection.
- Agent-first `/qa-init` bootstrap script and commands for Claude Code and OpenCode.
- Rules, agents, workflows and templates.
- Multi-agent documentation and adapters.
- Roadmap and backlog for implementation with Codex Desktop.

Refined:

- Safe no-overwrite behavior unless `--force` is passed.
- Config-aware doctor and feature validation.
- Adapter selection with default all-adapter generation.
- Init manifest tracking for generated files and adapter copies.
- Claude and OpenCode slash commands for init, full flow, doctor, clean and feature validation.
- Guided slash-command UX when commands are called without arguments.
- Copy-only bootstrap flow: copy `.qa-ai/`, run `bootstrap-agent-adapters.mjs`, then open the agent.
- End-to-end workflow documentation for folder-copy usage.
