# QA FlowKit

[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-green.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933.svg)](package.json)
[![Estado: Beta](https://img.shields.io/badge/estado-Beta-orange.svg)](docs/qa-ai/stability-policy.md)
[![Workflow: QA AI](https://img.shields.io/badge/workflow-QA%20AI-6f42c1.svg)](docs/qa-ai/workflow.md)
[![CI](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml/badge.svg)](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/qa-flowkit.svg)](https://www.npmjs.com/package/qa-flowkit)

Framework open-source portable y CLI npm para añadir un flujo de QA asistido por IA a un repositorio existente de QA o automatización.

Idioma: [English](README.md) | **Español**

## Tabla de Contenidos

- [Dos repositorios](#dos-repositorios)
- [Qué Hace](#qué-hace)
- [Inicio Rápido](#inicio-rápido)
- [Paquete npm](#paquete-npm)
- [Actualizar el framework](#actualizar-el-framework)
- [Rutas de Uso Guiadas](#rutas-de-uso-guiadas)
- [Bootstrap Desde Agente](#bootstrap-desde-agente)
- [Carpeta de Contexto QA](#carpeta-de-contexto-qa)
- [Tramos de workflow QA y ayuda guiada](#tramos-de-workflow-qa-y-ayuda-guiada)
- [Comandos](#comandos)
- [Validación](#validación)
- [Opciones de Init](#opciones-de-init)
- [Plantillas Base](#plantillas-base)
- [Adaptadores](#adaptadores)
- [Estructura Generada](#estructura-generada)
- [Reglas Gherkin](#reglas-gherkin)
- [Limpieza](#limpieza)
- [Documentación](#documentación)
- [Licencia](#licencia)

## Dos repositorios

|                   | Repositorio **fuente** QA FlowKit (este repo) | **Tu** repo de QA/automatización                                    |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Rol               | Framework, CLI, CI, paquete npm               | Requisitos, pruebas, `qa-ai-output/`                                |
| Instalación       | Clonar o contribuir aquí                      | `npx qa-flowkit@beta init`                                          |
| Archivo de agente | [AGENTS.md](AGENTS.md) en la raíz             | [AGENTS.md](.qa-ai/adapters/generic/AGENTS.md) generado tras `init` |

## Qué Hace

QA FlowKit está en fase **Beta** (`0.5.0-beta.x`): el flujo portable por copia de carpeta está implementado, validado en CI (incluido el fixture golden in-repo) y publica una CLI npm ([`qa-flowkit` en npm](https://www.npmjs.com/package/qa-flowkit)). Ejecutas `npx qa-flowkit init` en un repositorio objetivo y el repositorio recibe configuración, instrucciones para agentes, documentación de workflow, scripts de validación, plantillas y adaptadores para herramientas comunes de coding agents.

El starter **no** realiza escrituras externas en herramientas configuradas. Solo crea artefactos locales y propuestas antes de cualquier sincronización externa.

| Área         | Incluye                                                                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Carpeta portable `.qa-ai/`                                                                                                                                                                                  |
| Scripts      | `bootstrap-agent-adapters`, `init`, `config`, `doctor`, `clean`, `qa-help`, validadores reforzados, `validate-target`, `validate-release-gate`, `validate-test-design`, `smoke-test`, `sync-agent-adapters` |
| Reglas       | Aprobación, Gherkin, gestión de pruebas, automatización, UI automation y API testing                                                                                                                        |
| Agentes      | Agentes por fase y especialistas activos desde `.qa-ai/agents/specialists/active.md`                                                                                                                        |
| Plantillas   | Análisis de requisitos, diseño sistema/RF, trazabilidad, automatización, release gate y resumen de PR                                                                                                       |
| Ayuda guiada | `qa-help` y `/qa-help` recomiendan la siguiente fase según artefactos y `project.qaTrack`                                                                                                                   |
| Release gate | `release-gate.yaml` enterprise con decisiones `PASS` / `CONCERNS` / `FAIL` / `WAIVED`                                                                                                                       |
| Contexto QA  | Carpeta local opcional con prácticas del equipo para defaults asistidos por agente                                                                                                                          |
| Adaptadores  | AGENTS.md, Claude Code, Codex, OpenCode, Cline, Continue, Aider, Goose y Gemini CLI                                                                                                                         |

```text
Requisitos
  -> intake de requisitos
  -> validación de RF oficial y criterios de aceptación
  -> diseño de pruebas de sistema (standard / enterprise)
  -> propuesta de diseño de pruebas por RF
  -> archivos Gherkin (.feature)
  -> análisis de cobertura en gestión de pruebas
  -> plan de sincronización con gestión de pruebas
  -> matriz de trazabilidad
  -> viabilidad de automatización
  -> plan de implementación con el framework configurado
  -> resumen listo para PR
```

## Inicio Rápido

**Ruta de 5 minutos:** [getting-started.md](docs/qa-ai/getting-started.md#5-minute-quick-path) — `init` → `help` → un RF → validar.

Ejecuta esto desde el repositorio objetivo donde quieres instalar QA FlowKit (Node.js 20+):

```bash
npx qa-flowkit@beta init
```

Pin alpha heredado:

```bash
npx qa-flowkit@alpha init
```

### Presets

| Preset                         | Flag `init`                                         | `qaTrack` habitual | Automatización                         |
| ------------------------------ | --------------------------------------------------- | ------------------ | -------------------------------------- |
| Solo manual                    | `--preset manual-only`                              | `quick`            | Ninguna                                |
| WebdriverIO + Playwright API   | `--preset webdriverio-playwright-api` (por defecto) | `standard`         | UI + API                               |
| Selenium + Jest + BrowserStack | `--preset selenium-jest-browserstack`               | `standard`         | Stack alternativo                      |
| Karate full (API + UI)         | `--preset karate-full`                              | `standard`         | Karate DSL en `tests/karate/features/` |

Ver [config-schema.md](docs/qa-ai/config-schema.md).

Cuando no sepas qué ejecutar después:

```bash
npx qa-flowkit help
```

O `/qa-help` en Claude Code u OpenCode tras sincronizar adaptadores.

Después abre el repositorio con tu herramienta de IA y empieza con:

```text
Lee AGENTS.md, qa-ai.config.yaml, .qa-ai/rules/README.md y .qa-ai/workflows/full-flow.md. Sigue todos los archivos `.qa-ai/rules/*.rules.md` antes de modificar archivos.
```

Por defecto, init usa la plantilla base `webdriverio-playwright-api`, interfaz en inglés, Gherkin en inglés y solo el adaptador OpenCode. Crea primero la estructura mínima usable; los documentos QA iniciales y adaptadores extra son opt-in.

Alternativa por copia de carpeta (checkout del código fuente, entornos sin npm o contribuidores desde este repo):

```bash
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

## Paquete npm

| Elemento       | Detalle                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| Paquete        | [`qa-flowkit`](https://www.npmjs.com/package/qa-flowkit)                |
| Versión actual | `0.5.0-beta.0` (canal beta)                                             |
| Binario CLI    | `qa-flowkit` (`init`, `update`, `doctor`, `validate-target`, `help`, …) |
| Requisitos     | Node.js 20+                                                             |

**Repositorio destino (recomendado):**

```bash
npx qa-flowkit init
npx qa-flowkit update
npx qa-flowkit doctor
```

**Fijar beta durante Beta:**

```bash
npx qa-flowkit@beta init
npx qa-flowkit@beta update
```

**Publicar una nueva versión (mantenedores):**

1. Haz merge de PRs a `main` con [Conventional Commits](https://www.conventionalcommits.org/) en el título del PR (`feat:`, `fix:`, …).
2. Revisa y haz merge del **Release PR** que abre [release-please](.github/workflows/release-please.yml) (actualiza `package.json` y [CHANGELOG](CHANGELOG.md)).
3. Al mergear se crean GitHub Release + tag y se publica en npm con provenance. Las prereleases usan el dist-tag correspondiente (`alpha`, `beta`, …); semver estable publica como `latest`.
4. Preferible [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (OIDC) en el workflow `release-please.yml`; hasta configurarlo, usa el secret `NPM_TOKEN`. Emergencia: **Actions → Publish npm (manual fallback)**.

Consulta [release checklist](docs/qa-ai/release-checklist.md). Republicar una versión existente falla a propósito.

## Actualizar el framework

Si ya copiaste una versión anterior de `.qa-ai/` en tu repositorio, actualiza el **framework portable** con la CLI npm o desde una release reciente de [QA FlowKit](https://github.com/warante/QA_FlowKit). Tus artefactos de trabajo (`qa-ai.config.yaml`, `qa-ai-output/`, `features/`, `tests/`, cambios propios en `AGENTS.md`) están **fuera** de `.qa-ai/` y no se borran al reemplazar esa carpeta.

### Antes de empezar

1. Haz commit o copia de seguridad del repositorio (sobre todo `qa-ai.config.yaml` y `qa-ai-output/`).
2. Anota qué adaptadores usas (Claude Code, OpenCode, Codex, etc.).
3. Revisa las notas de la release o el [CHANGELOG](CHANGELOG.md) por claves nuevas de config (por ejemplo `project.qaTrack`, `testDesign.*`, `release.gatePath`).

### Pasos recomendados de actualización

**1. Recomendado: actualiza con npm**:

```bash
npx qa-flowkit update
```

Esto reemplaza solo `.qa-ai/`, preserva `.qa-ai/state/` y `.qa-ai/config-profiles/`, actualiza especialistas activos, sincroniza adaptadores existentes sin sobrescribirlos y ejecuta `doctor`.

**Fallback manual: sustituye la carpeta `.qa-ai/`** por la de la última versión de QA FlowKit (clone o tag):

```bash
# Unix / macOS (desde la raíz del repo objetivo)
rm -rf .qa-ai
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
```

```powershell
# Windows PowerShell (desde la raíz del repo objetivo)
Remove-Item -Recurse -Force .\.qa-ai
Copy-Item -Recurse -LiteralPath C:\path\to\QA_FlowKit\.qa-ai -Destination .\.qa-ai
```

**2. Actualiza comandos slash y adaptadores** (no modifica `qa-ai.config.yaml`):

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters claude,opencode --force
```

Incluye todos los adaptadores que uses (`generic`, `codex`, `cline`, `continue`, `aider`, `goose`, `gemini`) o usa `--adapters all`.

**3. Vuelve a ejecutar init sin sobrescribir tu config** (crea carpetas que falten y regenera `.qa-ai/agents/specialists/active.md`; no toca `qa-ai.config.yaml` salvo que uses `--force`):

```bash
node .qa-ai/scripts/init.mjs --no-adapters
```

**4. Incorpora a mano las claves nuevas en `qa-ai.config.yaml`** comparando con el preset en `.qa-ai/presets/`. No ejecutes `init.mjs --force` si no quieres reemplazar toda la config. Añadidos habituales en versiones recientes:

| Clave                     | Uso                                                      |
| ------------------------- | -------------------------------------------------------- |
| `project.qaTrack`         | Profundidad del flujo: `quick`, `standard`, `enterprise` |
| `testDesign.systemPath`   | Documento de diseño de pruebas de sistema                |
| `testDesign.proposalPath` | Propuesta de diseño por RF                               |
| `release.gatePath`        | YAML de release gate (enterprise)                        |

Para guardar tu config antes de editar:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/backup-antes-de-actualizar.yaml
```

**5. Añade plantillas que falten en `qa-ai-output/`** (opcional; solo crea archivos que no existan):

```bash
node .qa-ai/scripts/init.mjs --with-doc-templates --no-adapters
```

Usa `--force` solo si quieres resetear plantillas ya generadas bajo `qa-ai-output/`.

**6. Comprueba la actualización:**

```bash
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/qa-help.mjs
npm run qa:validate-target -- --allow-empty --allow-missing --no-strict-doctor
```

Ajusta los flags cuando el repo ya tenga `.feature` y artefactos reales del flujo QA.

### Qué sobrescribe init y qué no

| Ruta                                  | Por defecto al re-ejecutar init | Con `--force`                                  |
| ------------------------------------- | ------------------------------- | ---------------------------------------------- |
| `.qa-ai/`                             | Sustitución manual (paso 1)     | Igual                                          |
| `qa-ai.config.yaml`                   | No se toca si existe            | Se reemplaza desde el preset                   |
| `qa-ai-output/*.md` (plantillas)      | No se toca si existe            | Se reemplaza con `--with-doc-templates`        |
| `.claude/`, `.opencode/`, etc.        | No se toca                      | Se actualiza con `sync-agent-adapters --force` |
| `.qa-ai/agents/specialists/active.md` | Siempre se regenera             | Siempre se regenera                            |
| `features/`, `tests/`                 | Init no los modifica            | Init no los modifica                           |

### Actualización mínima agent-first

Si solo usas `/qa-init` en Claude Code u OpenCode:

```bash
rm -rf .qa-ai
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode --force
node .qa-ai/scripts/doctor.mjs
```

Después fusiona las claves nuevas en `qa-ai.config.yaml` y ejecuta `/qa-help` para ver las fases actualizadas.

## Rutas de Uso Guiadas

### Probar QA FlowKit en un repositorio nuevo

Usa el setup por defecto cuando quieras llegar rápido a un flujo QA AI funcional:

```bash
npx qa-flowkit init
```

### QA manual solamente

Usa esta opción cuando quieras flujo de requisitos a Gherkin y trazabilidad sin carpetas de automatización:

```bash
npx qa-flowkit init --preset manual-only --interface-language es --gherkin-language es
```

### Repositorio de automatización

Usa la plantilla por defecto para planificación WebdriverIO UI/E2E más Playwright API:

```bash
npx qa-flowkit init --preset webdriverio-playwright-api
npx qa-flowkit validate-features --allow-empty
```

### Setup desde agente

Usa esto cuando Claude Code u OpenCode deban guiar la inicialización mediante `/qa-init`:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

Después abre el agente y ejecuta:

```text
/qa-init
```

## Bootstrap Desde Agente

Usa este flujo cuando Claude Code u OpenCode deban inicializar el repo mediante `/qa-init`.

| Plataforma | Comando                                                                              |
| ---------- | ------------------------------------------------------------------------------------ |
| Unix/macOS | `cp -R /path/to/qa-flowkit/.qa-ai .qa-ai`                                            |
| PowerShell | `Copy-Item -Recurse -LiteralPath C:\path\to\qa-flowkit\.qa-ai -Destination .\.qa-ai` |

Después ejecuta:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

Abre Claude Code u OpenCode en el repositorio objetivo y ejecuta:

```text
/qa-init
```

Usa `/qa-init` en vez de `/init`; Claude Code y OpenCode ya tienen comandos internos llamados `/init`. El comando guiado pregunta idioma, plantilla base, adaptadores, overrides opcionales de framework y comportamiento de sobrescritura.

Forma directa avanzada:

```text
/qa-init --preset webdriverio-playwright-api --interface-language es --gherkin-language es --adapters claude,opencode
```

## Carpeta de Contexto QA

Para un setup más adaptado, añade una carpeta local al repo con documentación sobre cómo trabaja QA en tu equipo y lanza el init desde un agente:

```text
/qa-init --qa-context qa-ai-knowledge
```

El agente lee `.qa-ai/workflows/context-intake.md`, resume el contexto QA, propone flags de init por defecto, pide aprobación y después ejecuta `init.mjs` con `--qa-context <path>`. El script Node registra la carpeta aprobada en `qa-ai.config.yaml`; no interpreta los documentos por sí mismo.

Cuando esté activo, los workflows QA futuros deben leer primero estos artefactos configurados:

```text
qa-ai-output/qa-knowledge-summary.md
qa-ai-output/qa-init-decisions.md
```

## Tramos de workflow QA y ayuda guiada

QA FlowKit adapta la profundidad del flujo con `project.qaTrack` en `qa-ai.config.yaml` (inspirado en tramos de BMAD Method y decisiones TEA).

### Tramos de workflow

| Tramo        | Preset por defecto           | Fases activas (resumen)                                                                                                | Ideal para                                                 |
| ------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `quick`      | `manual-only`                | Intake, normalización, Gherkin, trazabilidad, PR                                                                       | QA manual, alcance acotado, Gherkin + trazabilidad rápidos |
| `standard`   | `webdriverio-playwright-api` | Flujo completo con planificación de gestión de pruebas, viabilidad y fases de automatización cuando estén configuradas | La mayoría de repos de automatización                      |
| `enterprise` | con `--qa-track enterprise`  | Igual que `standard` más **release gate** y `validate-target` más estricto                                             | Cumplimiento, auditoría y go/no-go formal                  |

Configura el tramo en init:

```bash
node .qa-ai/scripts/init.mjs --preset manual-only --qa-track quick
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --qa-track standard
node .qa-ai/scripts/init.mjs --qa-track enterprise --with-doc-templates
```

| Tramo        | Omitido por defecto                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quick`      | Cobertura/sync de gestión de pruebas, viabilidad de automatización, implementación UI/API, borradores de issues, diseño de pruebas de sistema, release gate |
| `standard`   | Release gate; fases omitidas cuando herramientas/frameworks son `none` (ver orquestador)                                                                    |
| `enterprise` | Nada más allá de omisiones por config; exige `release-gate.yaml` antes de dar el flujo por completo                                                         |

Detalle: [QA help y tramos](docs/qa-ai/qa-help.md).

### Ayuda guiada (`qa-help`)

`qa-help` inspecciona `qa-ai.config.yaml`, `qa-ai-output/`, `features/` y `.qa-ai/state/` para listar fases completadas, pendientes y omitidas, y muestra recomendaciones priorizadas (`required`, `recommended`, `optional`).

```bash
npm run qa:help
node .qa-ai/scripts/qa-help.mjs
node .qa-ai/scripts/qa-help.mjs --json
npx qa-flowkit help
```

Tras cada paso de `/qa-full-flow` o de un agente de fase, vuelve a ejecutar `/qa-help`. `/qa-status` incluye la salida de `qa-help` con el siguiente comando sugerido.

Si falta `qa-ai.config.yaml`, `qa-help` indica que ejecutes `npx qa-flowkit init` primero.

### Release gate (enterprise)

Tras el resumen de PR, registra una decisión formal en `qa-ai-output/release-gate.yaml`:

| Decisión   | Significado                                                |
| ---------- | ---------------------------------------------------------- |
| `PASS`     | Listo para release                                         |
| `CONCERNS` | Release con seguimientos documentados                      |
| `FAIL`     | Bloqueos pendientes                                        |
| `WAIVED`   | Excepción aceptada (requiere `approver` y `waived_reason`) |

```bash
node .qa-ai/scripts/validate-release-gate.mjs
npm run qa:validate-release-gate
```

`/qa-gate` guía al agente por el flujo del gate. `validate-target.mjs` ejecuta el validador del release gate automáticamente cuando `project.qaTrack` es `enterprise`.

Detalle: [Release gate](docs/qa-ai/release-gate.md).

### Diseño de pruebas dual-mode (standard / enterprise)

Antes de los `.feature` por RF, produce:

1. `qa-ai-output/test-design-system.md` — alineación de arquitectura, riesgos y estrategia transversal.
2. `qa-ai-output/test-design-proposal.md` — casos del RF/epic activo (aprobación antes de los `.feature`).

El tramo `quick` omite la fase de sistema y puede combinar propuesta + features en una sola pasada Gherkin.

Detalle: [Test design dual-mode](docs/qa-ai/test-design-dual-mode.md).

## Comandos

| Comando                                                                           | Propósito                                                                                           |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npx qa-flowkit init`                                                             | Instala `.qa-ai/`, genera config, carpetas y el adaptador OpenCode por defecto                      |
| `npx qa-flowkit update`                                                           | Actualiza `.qa-ai/` desde el paquete npm preservando artefactos del repo destino                    |
| `npx qa-flowkit doctor`                                                           | Revisa salud del setup desde la CLI npm                                                             |
| `npx qa-flowkit validate-target --allow-empty --allow-missing --no-strict-doctor` | Ejecuta validación del repo destino desde la CLI npm                                                |
| `node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode`       | Copia comandos slash mínimos para setup desde agente                                                |
| `node .qa-ai/scripts/init.mjs`                                                    | Genera la config mínima, carpetas y adaptador OpenCode                                              |
| `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge`                       | Registra una carpeta de contexto QA para defaults asistidos por agente                              |
| `node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml`        | Exporta la config actual como perfil reutilizable                                                   |
| `node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml`        | Importa un perfil de config reutilizable                                                            |
| `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all`                      | Sincroniza adaptadores seleccionados                                                                |
| `node .qa-ai/scripts/doctor.mjs`                                                  | Revisa salud del setup                                                                              |
| `node .qa-ai/scripts/doctor.mjs --strict`                                         | Falla checks tipo CI para repositorios destino inicializados                                        |
| `node .qa-ai/scripts/validate-features.mjs`                                       | Valida archivos `.feature` generados                                                                |
| `node .qa-ai/scripts/validate-traceability.mjs`                                   | Valida cobertura de IDs en la matriz de trazabilidad                                                |
| `node .qa-ai/scripts/validate-sync-plan.mjs`                                      | Valida planes de sincronización proposal-first                                                      |
| `node .qa-ai/scripts/validate-active-specialists.mjs`                             | Valida especialistas activos contra la config                                                       |
| `node .qa-ai/scripts/validate-target.mjs`                                         | Ejecuta validación estricta de repos destino tras artefactos QA reales                              |
| `npx qa-flowkit run start`                                                        | Inicia una ejecución reanudable del harness con paquetes de fase y gates de validación              |
| `npx qa-flowkit run next --json`                                                  | Devuelve el paquete de contexto de la fase activa para el agente                                    |
| `npx qa-flowkit run check`                                                        | Valida la fase activa y avanza cuando outputs y validadores pasan                                   |
| `npx qa-flowkit run retry`                                                        | Reinicia los intentos de validación tras una fase bloqueada por validación                          |
| `node .qa-ai/scripts/qa-help.mjs`                                                 | Recomienda la siguiente fase QA según artefactos y `project.qaTrack`                                |
| `node .qa-ai/scripts/validate-release-gate.mjs`                                   | Valida el YAML del release gate enterprise                                                          |
| `node .qa-ai/scripts/validate-test-design.mjs`                                    | Valida estructura de diseño de pruebas sistema y por RF                                             |
| `npm run qa:help`                                                                 | Igual que `qa-help.mjs`                                                                             |
| `npm run qa:validate-release-gate`                                                | Igual que `validate-release-gate.mjs`                                                               |
| `npm run qa:validate-test-design`                                                 | Igual que `validate-test-design.mjs`                                                                |
| `node .qa-ai/scripts/test-validators.mjs`                                         | Ejecuta tests unitarios nativos de helpers compartidos de validadores                               |
| `node .qa-ai/scripts/smoke-test.mjs`                                              | Ejecuta smoke checks de mantenimiento                                                               |
| `node .qa-ai/scripts/smoke-npm-pack.mjs`                                          | Ejecuta smoke checks de empaquetado e instalación npm                                               |
| `npm run validate:oss-extraction`                                                 | Ejecuta doctor, validadores reforzados, tests unitarios de validadores y smoke tests (igual que CI) |
| `node .qa-ai/scripts/clean.mjs`                                                   | Previsualiza limpieza de artefactos generados                                                       |

Los adaptadores de Claude Code y OpenCode también incluyen comandos slash guiados:

| Comando Slash           | Propósito                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `/qa-init`              | Inicialización guiada                                                                  |
| `/qa-config`            | Importa o exporta perfiles reutilizables de config QA AI                               |
| `/qa-full-flow`         | Flujo QA end-to-end de requisitos a PR                                                 |
| `/qa-add-tests`         | Añade pruebas para un RF nuevo sin alterar pruebas existentes                          |
| `/qa-update-tests`      | Revisa pruebas existentes tras cambios de RF y aplica cambios aprobados                |
| `/qa-automation-plan`   | Clasifica `.feature` existentes y planifica automatización                             |
| `/qa-coverage`          | Analiza cobertura funcional de RFs, pruebas manuales y automatizadas                   |
| `/qa-help`              | Guia contextual para el siguiente paso del flujo QA                                    |
| `/qa-status`            | Resume configuración, artefactos, salud de features y siguientes pasos                 |
| `/qa-gate`              | Registra decisión de release gate enterprise (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) |
| `/qa-doctor`            | Checks de salud del setup                                                              |
| `/qa-clean`             | Preview/ejecución de limpieza basada en manifiesto                                     |
| `/qa-validate-features` | Validación de convenciones Gherkin                                                     |

`init.mjs` y `config.mjs --import` nunca sobrescriben archivos existentes salvo que se pase `--force`. `validate-features.mjs` falla si no encuentra archivos `.feature`; usa `--allow-empty` solo para smoke checks del repo fuente u otros casos donde una carpeta vacía sea esperada.

## Validación

QA FlowKit usa validadores locales más fuertes sin dependencias externas:

| Validador                         | Comprueba                                                                                                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `doctor.mjs`                      | Assets del framework, scripts, reglas, plantillas, agentes, presets, adaptadores y rutas configuradas; `--strict` convierte artefactos de workflow y configs de framework de repos destino de warnings a fallos |
| `validate-features.mjs`           | Estructura Gherkin parseada, directiva de idioma, un Feature, un Scenario, criterios de aceptación, tags requeridos, RF IDs e IDs explícitos de test duplicados                                                 |
| `validate-traceability.mjs`       | Los identificadores RF/test de features aparecen en la matriz de trazabilidad configurada, con validación de forma de tabla Markdown y duplicados de caso/archivo                                               |
| `validate-sync-plan.mjs`          | Los planes de sincronización de gestión de pruebas siguen siendo proposal-first, mencionan aprobación, cubren IDs de features y pasan checks de tabla Markdown, IDs duplicados y mapping                        |
| `validate-active-specialists.mjs` | `.qa-ai/agents/specialists/active.md` coincide con `qa-ai.config.yaml` y existen los especialistas referenciados                                                                                                |
| `validate-release-gate.mjs`       | Forma del YAML de release gate, reglas de decision y rutas de evidencia                                                                                                                                         |
| `validate-test-design.mjs`        | Estructura de secciones en diseño de pruebas sistema y por RF                                                                                                                                                   |
| `smoke-test.mjs`                  | Instalación por copia de carpeta, import/export de config, adaptadores, no-overwrite, rechazo de rutas inseguras y comportamiento de validadores                                                                |

Para el CI del repo fuente:

```bash
npm run validate:oss-extraction
```

En un repositorio objetivo ya configurado, ejecuta los validadores sin `--allow-empty` / `--allow-missing` cuando los `.feature` y artefactos correspondientes deban existir.

Usa el modo estricto de doctor en la CI del repositorio destino después de inicializar y de que al menos un flujo QA real haya generado los artefactos configurados:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Para repositorios destino incompletos, usa `node .qa-ai/scripts/validate-target.mjs --allow-empty --allow-missing --no-strict-doctor`.

### Mapping de gestión de pruebas

Cuando se usa `--with-test-management-mapping`, init crea el archivo de mapping configurado como un objeto JSON vacío (`{}`) para que los repositorios nuevos no empiecen con IDs externos ficticios.

Usa [.qa-ai/templates/test-management-mapping.template.json](.qa-ai/templates/test-management-mapping.template.json) como referencia documentada. Las claves del mapping deben ser IDs RF/test como `RF-101` o `TC-001`, o rutas `.feature`. Los valores deben ser objetos solo con campos soportados: `externalId`, `section`, `suite`, `status`, `lastReviewedAt` y `notes`. No guardes secretos, tokens ni credenciales en archivos de mapping.

Para reutilizar el mismo setup en repositorios con la misma estructura, exporta un perfil desde el repo configurado e impórtalo en el siguiente:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml
node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml
```

Importar un perfil escribe `qa-ai.config.yaml`, crea las carpetas configuradas y refresca `.qa-ai/agents/specialists/active.md`. Usa `--no-structure` cuando solo quieras copiar el YAML.

## Opciones de Init

`init.mjs` funciona sin flags. Usa flags solo cuando la plantilla base o los idiomas por defecto no sean lo que necesitas.

| Opción                           | Valores                                                                                          | Default                      | Propósito                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------ |
| `--preset <name>`                | `webdriverio-playwright-api`, `selenium-jest-browserstack`, `manual-only`                        | `webdriverio-playwright-api` | Selecciona la plantilla base para generar `qa-ai.config.yaml`      |
| `--interface-language <lang>`    | `en`, `es`                                                                                       | `en`                         | Idioma de encabezados de artefactos QA y texto guiado del workflow |
| `--gherkin-language <lang>`      | `en`, `es`                                                                                       | `en`                         | Idioma de los archivos `.feature` generados                        |
| `--requirements-source <name>`   | `markdown`, `jira`, `confluence`, `pasted-text`, valor custom                                    | Valor de la plantilla base   | Define la fuente principal de requisitos                           |
| `--test-management-tool <name>`  | `none`, `testrail`, `zephyr`, `xray`, valor custom                                               | Valor de la plantilla base   | Define la herramienta de gestión de pruebas                        |
| `--issue-tracker <name>`         | `none`, `jira`, `github`, valor custom                                                           | Valor de la plantilla base   | Define el issue tracker configurado                                |
| `--qa-context <path>`            | carpeta local del repo                                                                           | off                          | Activa contexto QA para init asistido por agente                   |
| `--qa-track <name>`              | `quick`, `standard`, `enterprise`                                                                | Del preset                   | Controla profundidad del flujo y la lista de fases de `qa-help`    |
| `--adapters <list>`              | `all`, `generic`, `codex`, `claude`, `opencode`, `cline`, `continue`, `aider`, `goose`, `gemini` | `opencode`                   | Selecciona adaptadores de agentes generados                        |
| `--no-adapters`                  | flag                                                                                             | off                          | Omite generación de adaptadores                                    |
| `--with-doc-templates`           | flag                                                                                             | off                          | Genera artefactos Markdown iniciales bajo `qa-ai-output/`          |
| `--with-test-management-mapping` | flag                                                                                             | off                          | Crea el archivo configurado de mapping de gestión de pruebas       |
| `--force`                        | flag                                                                                             | off                          | Permite sobrescribir archivos generados                            |

Overrides avanzados de framework y rutas:

| Opción                          | Valores de Ejemplo                                                         | Propósito                                                     |
| ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `--ui-framework <name>`         | `none`, `undecided`, `webdriverio`, `playwright`, `cypress`, `selenium`    | Sobrescribe el framework UI/E2E de la plantilla base          |
| `--api-framework <name>`        | `none`, `undecided`, `playwright-api`, `postman`, `rest-assured`, `karate` | Sobrescribe el framework API/integration de la plantilla base |
| `--ui-specs-path <path>`        | `tests/wdio/specs`                                                         | Sobrescribe la ruta de specs UI                               |
| `--ui-page-objects-path <path>` | `tests/wdio/pageobjects`                                                   | Sobrescribe la ruta de page objects UI                        |
| `--api-specs-path <path>`       | `tests/api/specs`                                                          | Sobrescribe la ruta de specs API                              |
| `--specialist-mode <mode>`      | `auto`, `off`, `required`                                                  | Controla activación de especialistas                          |
| `--set <key=value>`             | `automation.ui.framework=cypress`                                          | Define directamente un valor escalar de config                |

Ejemplos:

```bash
# Setup por defecto
node .qa-ai/scripts/init.mjs

# Interfaz en español y Gherkin en español, sin carpetas de automatización
npx qa-flowkit init --preset manual-only --interface-language es --gherkin-language es

# Generar solo adaptadores generic y Codex
node .qa-ai/scripts/init.mjs --adapters generic,codex

# Generar también plantillas iniciales de artefactos QA
node .qa-ai/scripts/init.mjs --with-doc-templates

# Registrar una carpeta de contexto QA tras la revision del agente
node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge

# Generar todos los adaptadores soportados
node .qa-ai/scripts/init.mjs --adapters all
```

Los flags de framework y rutas son overrides avanzados. Si una plantilla base ya define los frameworks que quieres, omite esos flags para conservar las rutas de la plantilla.

## Plantillas Base

El flag se sigue llamando `--preset` por compatibilidad con la CLI, pero conceptualmente son plantillas base: aportan una configuración inicial completa que tus flags pueden sobrescribir.

| Plantilla Base (`--preset`)  | Mejor Para                               | Automatización Por Defecto          |
| ---------------------------- | ---------------------------------------- | ----------------------------------- |
| `webdriverio-playwright-api` | Repositorios de QA + automatización      | WebdriverIO UI/E2E y Playwright API |
| `selenium-jest-browserstack` | Automatización UI estilo Selenium        | Carpetas Selenium/Jest/BrowserStack |
| `manual-only`                | Diseño QA sin carpetas de automatización | Ninguna                             |

## Adaptadores

| Adaptador   | Ruta Generada                | Notas                                            |
| ----------- | ---------------------------- | ------------------------------------------------ |
| Genérico    | `AGENTS.md`                  | Reglas de seguridad y comportamiento cross-agent |
| Claude Code | `.claude/`                   | Slash commands, incluido `/qa-init`              |
| Codex       | `.codex/`                    | Prompts de onboarding para Codex                 |
| OpenCode    | `.opencode/`                 | Slash commands, incluido `/qa-init`              |
| Cline       | `.clinerules`, `.cline/`     | Reglas y documentación para Cline                |
| Continue    | `.continue/`                 | Guía de revisión y checks                        |
| Aider       | `.aider.conf.yml`, `.aider/` | Lista de lectura y notas de comandos             |
| Goose       | `.goose/`                    | Receta reutilizable de workflow                  |
| Gemini CLI  | `GEMINI.md`                  | Contexto de proyecto para Gemini CLI             |

## Estructura Generada

```text
qa-ai.config.yaml
.opencode/
qa-ai-output/
qa-ai-output/qa-knowledge-summary.md       # Opcional, escrito por intake de contexto QA asistido por agente
qa-ai-output/qa-init-decisions.md          # Opcional, escrito por intake de contexto QA asistido por agente
features/
tests/

# Opcional, solo cuando se pide mediante --adapters
AGENTS.md
.claude/
.codex/
.cline/
.clinerules
.continue/
.aider.conf.yml
.aider/
.goose/
GEMINI.md
```

El init por defecto crea solo los archivos y carpetas mínimos. No crea artefactos iniciales `qa-ai-output/*.md` salvo que pases `--with-doc-templates`, y solo genera el adaptador OpenCode salvo que `--adapters` pida más.

Las subcarpetas exactas de `tests/` dependen de la configuración. Init crea rutas UI/API cuando hay frameworks configurados, y omite carpetas de automatización cuando los frameworks son `none` o `undecided`.

Cuando `project.interfaceLanguage` es `es`, init localiza los encabezados de los artefactos Markdown de QA. El idioma de Gherkin se controla por separado con `gherkin.language`.

## Reglas Gherkin

| Regla                   | Requisito                                                                  |
| ----------------------- | -------------------------------------------------------------------------- |
| Idioma                  | Inglés (`en`) o español (`es`) desde `qa-ai.config.yaml`                   |
| Directiva en español    | Los `.feature` en español deben incluir `# language: es`                   |
| Modelo de archivo       | Un `.feature` por caso de prueba                                           |
| Modelo de escenario     | Una keyword de escenario configurada por archivo                           |
| Criterios de aceptación | `Acceptance Criteria:` en inglés o `Criterios de aceptación:` en español   |
| Tags requeridos         | `@priority:<valor>`, `@type:<valor>`, `@manual:<valor>`                    |
| Alcance                 | Las pruebas manuales tienen `.feature`; unit tests quedan fuera de alcance |

## Limpieza

`init.mjs` y `sync-agent-adapters.mjs` mantienen un manifiesto en:

```text
.qa-ai/state/init-manifest.json
```

La limpieza es dry-run por defecto:

```bash
node .qa-ai/scripts/clean.mjs
```

Para ejecutar limpieza, pasa `--force` y el alcance:

```bash
node .qa-ai/scripts/clean.mjs --generated --force
node .qa-ai/scripts/clean.mjs --adapters --empty-dirs --force
node .qa-ai/scripts/clean.mjs --all --force
```

Reglas de seguridad:

- Solo se eliminan archivos rastreados en el manifiesto.
- Los archivos modificados desde init se omiten por defecto.
- `--include-modified` es obligatorio para borrar archivos rastreados modificados.
- Las carpetas se eliminan solo si están rastreadas y vacías.
- La carpeta copiada `.qa-ai/` no se elimina con `clean`.

## Documentación

| Documento                                                          | Propósito                                                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [Primeros pasos](docs/qa-ai/getting-started.md)                    | Flujos de configuración paso a paso por tipo de usuario                                 |
| [Notas del piloto](docs/qa-ai/pilot-findings.md)                   | Hallazgos del primer piloto, puntos de fricción y guía de migración                     |
| [Repositorios ejemplo](docs/qa-ai/example-repos.md)                | Fixture golden in-repo y plantilla de CI                                                |
| [Esquema de config](docs/qa-ai/config-schema.md)                   | Claves de `qa-ai.config.yaml` desde presets                                             |
| [Extensibilidad](docs/qa-ai/extensibility.md)                      | Añadir especialistas, reglas, validadores y adaptadores                                 |
| [Política de estabilidad](docs/qa-ai/stability-policy.md)          | Contrato beta y migración desde alpha                                                   |
| [QA help y tracks](docs/qa-ai/qa-help.md)                          | Siguiente paso contextual y profundidad del flujo (`quick` / `standard` / `enterprise`) |
| [Release gate](docs/qa-ai/release-gate.md)                         | Decisión go/no-go enterprise (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`)                  |
| [Test design dual-mode](docs/qa-ai/test-design-dual-mode.md)       | Diseño de pruebas a nivel sistema y por RF (inspirado en BMAD TEA)                      |
| [Arnés para agentes](docs/qa-ai/agent-harness.md)                  | Workflow reanudable planificado y modelo de comandos para usuarios                      |
| [Arquitectura del arnés](docs/qa-ai/agent-harness-architecture.md) | Contratos técnicos, estado y plan de implementación                                     |
| [Solución de problemas](docs/qa-ai/troubleshooting.md)             | Fallos comunes y cómo resolverlos                                                       |
| [Transcripts de terminal](docs/qa-ai/terminal-transcripts.md)      | Salida real de comandos para flujos comunes                                             |
| [Checklist de release](docs/qa-ai/release-checklist.md)            | Pasos para publicar una nueva versión en npm                                            |
| [Arquitectura](docs/qa-ai/architecture.md)                         | Estructura del framework y modelo de seguridad                                          |
| [Workflow](docs/qa-ai/workflow.md)                                 | Flujo QA end-to-end                                                                     |
| [Compatibilidad de agentes](docs/qa-ai/agent-compatibility.md)     | Adaptadores y discovery de comandos                                                     |
| [Personalización de agentes](docs/qa-ai/customizing-agents.md)     | Cómo adaptar agentes, especialistas y adaptadores de forma segura                       |
| [Limpieza](docs/qa-ai/cleanup.md)                                  | Detalles de limpieza basada en manifiesto                                               |
| [Migración CLI npm](docs/qa-ai/npm-migration-plan.md)              | Instalación npm, contrato de update y workflow de release                               |
| [Roadmap](ROADMAP.md)                                              | Dirección del producto                                                                  |
| [Contribuir](CONTRIBUTING.md)                                      | Guía de contribución                                                                    |
| [Seguridad](SECURITY.md)                                           | Política de vulnerabilidades y secretos                                                 |

## Licencia

MIT. Ver [LICENSE](LICENSE).
