# QA AI Starter

[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-green.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933.svg)](package.json)
[![Estado: Early Product](https://img.shields.io/badge/estado-Early%20Product-blue.svg)](ROADMAP.md)
[![Workflow: QA AI](https://img.shields.io/badge/workflow-QA%20AI-6f42c1.svg)](docs/qa-ai/workflow.md)
[![CI](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml/badge.svg)](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml)

Starter open-source y portable para a?adir un flujo de QA asistido por IA a un repositorio existente de QA o automatizaci?n.

Idioma: [English](README.md) | **Espa?ol**

## Tabla de Contenidos

- [Qu? Hace](#qu?-hace)
- [Inicio R?pido](#inicio-r?pido)
- [Actualizar el framework](#actualizar-el-framework)
- [Rutas de Uso Guiadas](#rutas-de-uso-guiadas)
- [Bootstrap Desde Agente](#bootstrap-desde-agente)
- [Carpeta de Contexto QA](#carpeta-de-contexto-qa)
- [Tramos de workflow QA y ayuda guiada](#tramos-de-workflow-qa-y-ayuda-guiada)
- [Comandos](#comandos)
- [Validaci?n](#validaci?n)
- [Opciones de Init](#opciones-de-init)
- [Plantillas Base](#plantillas-base)
- [Adaptadores](#adaptadores)
- [Estructura Generada](#estructura-generada)
- [Reglas Gherkin](#reglas-gherkin)
- [Limpieza](#limpieza)
- [Documentaci?n](#documentaci?n)
- [Licencia](#licencia)

## Qu? Hace

QA AI Starter est? en fase **Early Product**: el flujo portable por copia de carpeta est? implementado, validado en CI y listo para uso p?blico mientras maduran los validadores, ejemplos y empaquetado. Copias `.qa-ai/` en un repositorio objetivo, ejecutas scripts locales de Node.js y el repositorio recibe configuraci?n, instrucciones para agentes, documentaci?n de workflow, scripts de validaci?n, plantillas y adaptadores para herramientas comunes de coding agents.

El starter **no** realiza escrituras externas en herramientas configuradas. Solo crea artefactos locales y propuestas antes de cualquier sincronizaci?n externa.

| ?rea | Incluye |
|---|---|
| Framework | Carpeta portable `.qa-ai/` |
| Scripts | `bootstrap-agent-adapters`, `init`, `config`, `doctor`, `clean`, `qa-help`, validadores reforzados, `validate-target`, `validate-release-gate`, `validate-test-design`, `smoke-test`, `sync-agent-adapters` |
| Reglas | Aprobaci?n, Gherkin, gesti?n de pruebas, automatizaci?n, UI automation y API testing |
| Agentes | Agentes por fase y especialistas activos desde `.qa-ai/agents/specialists/active.md` |
| Plantillas | An?lisis de requisitos, dise?o de pruebas, trazabilidad, planificaci?n de automatizaci?n y resumen de PR |
| Contexto QA | Carpeta local opcional con practicas del equipo para defaults asistidos por agente |
| Adaptadores | AGENTS.md, Claude Code, Codex, OpenCode, Cline, Continue, Aider, Goose y Gemini CLI |

```text
Requisitos
  -> intake de requisitos
  -> validaci?n de RF oficial y criterios de aceptaci?n
  -> an?lisis de cobertura en gesti?n de pruebas
  -> dise?o de pruebas Gherkin
  -> plan de sincronizaci?n con gesti?n de pruebas
  -> matriz de trazabilidad
  -> viabilidad de automatizaci?n
  -> plan de implementaci?n con el framework configurado
  -> resumen listo para PR
```

## Inicio R?pido

Ejecuta esto desde el repositorio objetivo donde quieres instalar el starter:

```bash
cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

Despu?s abre el repositorio con tu herramienta de IA y empieza con:

```text
Lee AGENTS.md, qa-ai.config.yaml y .qa-ai/workflows/full-flow.md. Sigue .qa-ai/rules/ antes de modificar archivos.
```

Por defecto, init usa la plantilla base `webdriverio-playwright-api`, interfaz en ingl?s, Gherkin en ingl?s y solo el adaptador OpenCode. Crea primero la estructura m?nima usable; los documentos QA iniciales y adaptadores extra son opt-in.

## Actualizar el framework

Si ya copiaste una versi?n anterior de `.qa-ai/` en tu repositorio, actualiza el **framework portable** desde una release reciente de [QA FlowKit](https://github.com/warante/QA_FlowKit). Tus artefactos de trabajo (`qa-ai.config.yaml`, `qa-ai-output/`, `features/`, `tests/`, cambios propios en `AGENTS.md`) est?n **fuera** de `.qa-ai/` y no se borran al reemplazar esa carpeta.

### Antes de empezar

1. Haz commit o copia de seguridad del repositorio (sobre todo `qa-ai.config.yaml` y `qa-ai-output/`).
2. Anota qu? adaptadores usas (Claude Code, OpenCode, Codex, etc.).
3. Revisa las notas de la release o el [CHANGELOG](CHANGELOG.md) por claves nuevas de config (por ejemplo `project.qaTrack`, `testDesign.*`, `release.gatePath`).

### Pasos recomendados de actualizaci?n

**1. Sustituye la carpeta `.qa-ai/`** por la de la ?ltima versi?n de QA FlowKit (clone o tag):

```bash
# Unix / macOS (desde la ra?z del repo objetivo)
rm -rf .qa-ai
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
```

```powershell
# Windows PowerShell (desde la ra?z del repo objetivo)
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

**4. Incorpora a mano las claves nuevas en `qa-ai.config.yaml`** comparando con el preset en `.qa-ai/presets/`. No ejecutes `init.mjs --force` si no quieres reemplazar toda la config. A?adidos habituales en versiones recientes:

| Clave | Uso |
|---|---|
| `project.qaTrack` | Profundidad del flujo: `quick`, `standard`, `enterprise` |
| `testDesign.systemPath` | Documento de dise?o de pruebas de sistema |
| `testDesign.proposalPath` | Propuesta de dise?o por RF |
| `release.gatePath` | YAML de release gate (enterprise) |

Para guardar tu config antes de editar:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/backup-antes-de-actualizar.yaml
```

**5. A?ade plantillas que falten en `qa-ai-output/`** (opcional; solo crea archivos que no existan):

```bash
node .qa-ai/scripts/init.mjs --with-doc-templates --no-adapters
```

Usa `--force` solo si quieres resetear plantillas ya generadas bajo `qa-ai-output/`.

**6. Comprueba la actualizaci?n:**

```bash
node .qa-ai/scripts/doctor.mjs
node .qa-ai/scripts/qa-help.mjs
npm run qa:validate-target -- --allow-empty --allow-missing --no-strict-doctor
```

Ajusta los flags cuando el repo ya tenga `.feature` y artefactos reales del flujo QA.

### Qu? sobrescribe init y qu? no

| Ruta | Por defecto al re-ejecutar init | Con `--force` |
|---|---|---|
| `.qa-ai/` | Sustituci?n manual (paso 1) | Igual |
| `qa-ai.config.yaml` | No se toca si existe | Se reemplaza desde el preset |
| `qa-ai-output/*.md` (plantillas) | No se toca si existe | Se reemplaza con `--with-doc-templates` |
| `.claude/`, `.opencode/`, etc. | No se toca | Se actualiza con `sync-agent-adapters --force` |
| `.qa-ai/agents/specialists/active.md` | Siempre se regenera | Siempre se regenera |
| `features/`, `tests/` | Init no los modifica | Init no los modifica |

### Actualizaci?n m?nima agent-first

Si solo usas `/qa-init` en Claude Code u OpenCode:

```bash
rm -rf .qa-ai
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode --force
node .qa-ai/scripts/doctor.mjs
```

Despu?s fusiona las claves nuevas en `qa-ai.config.yaml` y ejecuta `/qa-help` para ver las fases actualizadas.

## Rutas de Uso Guiadas

### Probar QA FlowKit en un repositorio nuevo

Usa el setup por defecto cuando quieras llegar r?pido a un flujo QA AI funcional:

```bash
cp -R /path/to/QA_FlowKit/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs
node .qa-ai/scripts/doctor.mjs
```

### QA manual solamente

Usa esta opci?n cuando quieras flujo de requisitos a Gherkin y trazabilidad sin carpetas de automatizaci?n:

```bash
node .qa-ai/scripts/init.mjs --preset manual-only --interface-language es --gherkin-language es
```

### Repositorio de automatizaci?n

Usa la plantilla por defecto para planificaci?n WebdriverIO UI/E2E m?s Playwright API:

```bash
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api
node .qa-ai/scripts/validate-features.mjs --allow-empty
```

### Setup desde agente

Usa esto cuando Claude Code u OpenCode deban guiar la inicializaci?n mediante `/qa-init`:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

Despu?s abre el agente y ejecuta:

```text
/qa-init
```

## Bootstrap Desde Agente

Usa este flujo cuando Claude Code u OpenCode deban inicializar el repo mediante `/qa-init`.

| Plataforma | Comando |
|---|---|
| Unix/macOS | `cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai` |
| PowerShell | `Copy-Item -Recurse -LiteralPath C:\path\to\qa-ai-starter\.qa-ai -Destination .\.qa-ai` |

Despu?s ejecuta:

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

Para un setup mas adaptado, anade una carpeta local al repo con documentacion sobre como trabaja QA en tu equipo y lanza el init desde un agente:

```text
/qa-init --qa-context qa-ai-knowledge
```

El agente lee `.qa-ai/workflows/context-intake.md`, resume el contexto QA, propone flags de init por defecto, pide aprobacion y despues ejecuta `init.mjs` con `--qa-context <path>`. El script Node registra la carpeta aprobada en `qa-ai.config.yaml`; no interpreta los documentos por si mismo.

Cuando este activo, los workflows QA futuros deben leer primero estos artefactos configurados:

```text
qa-ai-output/qa-knowledge-summary.md
qa-ai-output/qa-init-decisions.md
```

Usa `node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge` para registrar una carpeta de contexto QA despues de que el agente la haya revisado.

Cuando no sepas que ejecutar a continuacion:

```bash
node .qa-ai/scripts/qa-help.mjs
```

O usa `/qa-help` en Claude Code u OpenCode tras sincronizar adaptadores.

## Tramos de workflow QA y ayuda guiada

QA FlowKit adapta la profundidad del flujo con `project.qaTrack` en `qa-ai.config.yaml` (inspirado en tramos de BMAD Method y decisiones TEA).

### Tramos de workflow

| Tramo | Preset por defecto | Fases activas (resumen) | Ideal para |
|---|---|---|---|
| `quick` | `manual-only` | Intake, normalizacion, Gherkin, trazabilidad, PR | QA manual, alcance acotado |
| `standard` | `webdriverio-playwright-api` | Flujo completo con diseno de pruebas sistema + RF, gestion de pruebas y automatizacion cuando aplique | Repos de automatizacion |
| `enterprise` | con `--qa-track enterprise` | Igual que `standard` mas **release gate** y `validate-target` mas estricto | Cumplimiento y auditoria |

Ejemplos en init:

```bash
node .qa-ai/scripts/init.mjs --preset manual-only --qa-track quick
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --qa-track standard
node .qa-ai/scripts/init.mjs --qa-track enterprise --with-doc-templates
```

Detalle: [QA help y tramos](docs/qa-ai/qa-help.md).

### Ayuda guiada (`qa-help`)

```bash
npm run qa:help
node .qa-ai/scripts/qa-help.mjs --json
```

### Release gate (enterprise)

```bash
npm run qa:validate-release-gate
```

Comando `/qa-gate`. Detalle: [Release gate](docs/qa-ai/release-gate.md).

### Diseno de pruebas dual-mode (standard / enterprise)

1. `qa-ai-output/test-design-system.md` ? estrategia transversal.
2. `qa-ai-output/test-design-proposal.md` ? casos del RF activo (aprobacion antes de `.feature`).

El tramo `quick` omite el documento de sistema. Detalle: [Test design dual-mode](docs/qa-ai/test-design-dual-mode.md).

## Comandos

| Comando | Prop?sito |
|---|---|
| `node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode` | Copia comandos slash m?nimos para setup desde agente |
| `node .qa-ai/scripts/init.mjs` | Genera la config m?nima, carpetas y adaptador OpenCode |
| `node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml` | Exporta la config actual como perfil reutilizable |
| `node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml` | Importa un perfil de config reutilizable |
| `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all` | Sincroniza adaptadores seleccionados |
| `node .qa-ai/scripts/doctor.mjs` | Revisa salud del setup |
| `node .qa-ai/scripts/doctor.mjs --strict` | Falla checks tipo CI para repositorios destino inicializados |
| `node .qa-ai/scripts/validate-features.mjs` | Valida archivos `.feature` generados |
| `node .qa-ai/scripts/validate-traceability.mjs` | Valida cobertura de IDs en la matriz de trazabilidad |
| `node .qa-ai/scripts/validate-sync-plan.mjs` | Valida planes de sincronizaci?n proposal-first |
| `node .qa-ai/scripts/validate-active-specialists.mjs` | Valida especialistas activos contra la config |
| `node .qa-ai/scripts/validate-target.mjs` | Ejecuta validacion estricta de repos destino tras artefactos QA reales |
| `node .qa-ai/scripts/qa-help.mjs` | Recomienda la siguiente fase QA segun artefactos y `project.qaTrack` |
| `node .qa-ai/scripts/validate-release-gate.mjs` | Valida el YAML del release gate enterprise |
| `node .qa-ai/scripts/validate-test-design.mjs` | Valida estructura de diseno de pruebas sistema y por RF |
| `npm run qa:help` | Igual que `qa-help.mjs` |
| `npm run qa:validate-release-gate` | Igual que `validate-release-gate.mjs` |
| `npm run qa:validate-test-design` | Igual que `validate-test-design.mjs` |
| `node .qa-ai/scripts/test-validators.mjs` | Ejecuta tests unitarios nativos de helpers compartidos de validadores |
| `node .qa-ai/scripts/smoke-test.mjs` | Ejecuta smoke checks de mantenimiento |
| `npm run validate:oss-extraction` | Ejecuta doctor, validadores reforzados, tests unitarios de validadores y smoke tests (igual que CI) |
| `node .qa-ai/scripts/clean.mjs` | Previsualiza limpieza de artefactos generados |

Los adaptadores de Claude Code y OpenCode tambien incluyen comandos slash guiados:

| Comando Slash | Proposito |
|---|---|
| `/qa-init` | Inicializacion guiada |
| `/qa-config` | Importa o exporta perfiles reutilizables de config QA AI |
| `/qa-full-flow` | Flujo QA end-to-end de requisitos a PR |
| `/qa-add-tests` | Anade pruebas para un RF nuevo sin alterar pruebas existentes |
| `/qa-update-tests` | Revisa pruebas existentes tras cambios de RF y aplica cambios aprobados |
| `/qa-automation-plan` | Clasifica `.feature` existentes y planifica automatizacion |
| `/qa-coverage` | Analiza cobertura funcional de RFs, pruebas manuales y automatizadas |
| `/qa-help` | Guia contextual para el siguiente paso del flujo QA |
| `/qa-status` | Resume configuracion, artefactos, salud de features y siguientes pasos |
| `/qa-gate` | Registra decision de release gate enterprise |
| `/qa-doctor` | Checks de salud del setup |
| `/qa-clean` | Preview/ejecucion de limpieza basada en manifiesto |
| `/qa-validate-features` | Validacion de convenciones Gherkin |

`init.mjs` y `config.mjs --import` nunca sobrescriben archivos existentes salvo que se pase `--force`. `validate-features.mjs` falla si no encuentra archivos `.feature`; usa `--allow-empty` solo para smoke checks del repo fuente u otros casos donde una carpeta vacia sea esperada.

## Validaci?n

QA FlowKit usa validadores locales m?s fuertes sin dependencias externas:

| Validador | Comprueba |
|---|---|
| `doctor.mjs` | Assets del framework, scripts, reglas, plantillas, agentes, presets, adaptadores y rutas configuradas; `--strict` convierte artefactos de workflow y configs de framework de repos destino de warnings a fallos |
| `validate-features.mjs` | Estructura Gherkin parseada, directiva de idioma, un Feature, un Scenario, criterios de aceptaci?n, tags requeridos, RF IDs e IDs expl?citos de test duplicados |
| `validate-traceability.mjs` | Los identificadores RF/test de features aparecen en la matriz de trazabilidad configurada, con validacion de forma de tabla Markdown y duplicados de caso/archivo |
| `validate-sync-plan.mjs` | Los planes de sincronizacion de gestion de pruebas siguen siendo proposal-first, mencionan aprobacion, cubren IDs de features y pasan checks de tabla Markdown, IDs duplicados y mapping |
| `validate-active-specialists.mjs` | `.qa-ai/agents/specialists/active.md` coincide con `qa-ai.config.yaml` y existen los especialistas referenciados |
| `validate-release-gate.mjs` | Forma del YAML de release gate, reglas de decision y rutas de evidencia |
| `validate-test-design.mjs` | Estructura de secciones en diseno de pruebas sistema y por RF |
| `smoke-test.mjs` | Instalaci?n por copia de carpeta, import/export de config, adaptadores, no-overwrite, rechazo de rutas inseguras y comportamiento de validadores |

Para el CI del repo fuente:

```bash
npm run validate:oss-extraction
```

En un repositorio objetivo ya configurado, ejecuta los validadores sin `--allow-empty` / `--allow-missing` cuando los `.feature` y artefactos correspondientes deban existir.

Usa el modo estricto de doctor en la CI del repositorio destino despues de inicializar y de que al menos un flujo QA real haya generado los artefactos configurados:

```bash
node .qa-ai/scripts/validate-target.mjs
```

Para repositorios destino incompletos, usa `node .qa-ai/scripts/validate-target.mjs --allow-empty --allow-missing --no-strict-doctor`.

### Mapping de gestion de pruebas

Cuando se usa `--with-test-management-mapping`, init crea el archivo de mapping configurado como un objeto JSON vacio (`{}`) para que los repositorios nuevos no empiecen con IDs externos ficticios.

Usa [.qa-ai/templates/test-management-mapping.template.json](.qa-ai/templates/test-management-mapping.template.json) como referencia documentada. Las claves del mapping deben ser IDs RF/test como `RF-101` o `TC-001`, o rutas `.feature`. Los valores deben ser objetos solo con campos soportados: `externalId`, `section`, `suite`, `status`, `lastReviewedAt` y `notes`. No guardes secretos, tokens ni credenciales en archivos de mapping.

Para reutilizar el mismo setup en repositorios con la misma estructura, exporta un perfil desde el repo configurado e importalo en el siguiente:

```bash
node .qa-ai/scripts/config.mjs --export .qa-ai/config-profiles/team.yaml
node .qa-ai/scripts/config.mjs --import .qa-ai/config-profiles/team.yaml
```

Importar un perfil escribe `qa-ai.config.yaml`, crea las carpetas configuradas y refresca `.qa-ai/agents/specialists/active.md`. Usa `--no-structure` cuando solo quieras copiar el YAML.

## Opciones de Init

`init.mjs` funciona sin flags. Usa flags solo cuando la plantilla base o los idiomas por defecto no sean lo que necesitas.

| Opci?n | Valores | Default | Prop?sito |
|---|---|---|---|
| `--preset <name>` | `webdriverio-playwright-api`, `selenium-jest-browserstack`, `manual-only` | `webdriverio-playwright-api` | Selecciona la plantilla base para generar `qa-ai.config.yaml` |
| `--interface-language <lang>` | `en`, `es` | `en` | Idioma de encabezados de artefactos QA y texto guiado del workflow |
| `--gherkin-language <lang>` | `en`, `es` | `en` | Idioma de los archivos `.feature` generados |
| `--requirements-source <name>` | `markdown`, `jira`, `confluence`, `pasted-text`, valor custom | Valor de la plantilla base | Define la fuente principal de requisitos |
| `--test-management-tool <name>` | `none`, `testrail`, `zephyr`, `xray`, valor custom | Valor de la plantilla base | Define la herramienta de gesti?n de pruebas |
| `--issue-tracker <name>` | `none`, `jira`, `github`, valor custom | Valor de la plantilla base | Define el issue tracker configurado |
| `--qa-context <path>` | carpeta local del repo | off | Activa contexto QA para init asistido por agente |
| `--adapters <list>` | `all`, `generic`, `codex`, `claude`, `opencode`, `cline`, `continue`, `aider`, `goose`, `gemini` | `opencode` | Selecciona adaptadores de agentes generados |
| `--no-adapters` | flag | off | Omite generaci?n de adaptadores |
| `--with-doc-templates` | flag | off | Genera artefactos Markdown iniciales bajo `qa-ai-output/` |
| `--with-test-management-mapping` | flag | off | Crea el archivo configurado de mapping de gesti?n de pruebas |
| `--force` | flag | off | Permite sobrescribir archivos generados |

Overrides avanzados de framework y rutas:

| Opci?n | Valores de Ejemplo | Prop?sito |
|---|---|---|
| `--ui-framework <name>` | `none`, `undecided`, `webdriverio`, `playwright`, `cypress`, `selenium` | Sobrescribe el framework UI/E2E de la plantilla base |
| `--api-framework <name>` | `none`, `undecided`, `playwright-api`, `postman`, `rest-assured`, `karate` | Sobrescribe el framework API/integration de la plantilla base |
| `--ui-specs-path <path>` | `tests/wdio/specs` | Sobrescribe la ruta de specs UI |
| `--ui-page-objects-path <path>` | `tests/wdio/pageobjects` | Sobrescribe la ruta de page objects UI |
| `--api-specs-path <path>` | `tests/api/specs` | Sobrescribe la ruta de specs API |
| `--specialist-mode <mode>` | `auto`, `off`, `required` | Controla activaci?n de especialistas |
| `--set <key=value>` | `automation.ui.framework=cypress` | Define directamente un valor escalar de config |

Ejemplos:

```bash
# Setup por defecto
node .qa-ai/scripts/init.mjs

# Interfaz en espa?ol y Gherkin en espa?ol, sin carpetas de automatizaci?n
node .qa-ai/scripts/init.mjs --preset manual-only --interface-language es --gherkin-language es

# Generar solo adaptadores generic y Codex
node .qa-ai/scripts/init.mjs --adapters generic,codex

# Generar tambi?n plantillas iniciales de artefactos QA
node .qa-ai/scripts/init.mjs --with-doc-templates

# Registrar una carpeta de contexto QA tras la revision del agente
node .qa-ai/scripts/init.mjs --qa-context qa-ai-knowledge

# Generar todos los adaptadores soportados
node .qa-ai/scripts/init.mjs --adapters all
```

Los flags de framework y rutas son overrides avanzados. Si una plantilla base ya define los frameworks que quieres, omite esos flags para conservar las rutas de la plantilla.

## Plantillas Base

El flag se sigue llamando `--preset` por compatibilidad con la CLI, pero conceptualmente son plantillas base: aportan una configuraci?n inicial completa que tus flags pueden sobrescribir.

| Plantilla Base (`--preset`) | Mejor Para | Automatizaci?n Por Defecto |
|---|---|---|
| `webdriverio-playwright-api` | Repositorios de QA + automatizaci?n | WebdriverIO UI/E2E y Playwright API |
| `selenium-jest-browserstack` | Automatizaci?n UI estilo Selenium | Carpetas Selenium/Jest/BrowserStack |
| `manual-only` | Dise?o QA sin carpetas de automatizaci?n | Ninguna |

## Adaptadores

| Adaptador | Ruta Generada | Notas |
|---|---|---|
| Gen?rico | `AGENTS.md` | Reglas de seguridad y comportamiento cross-agent |
| Claude Code | `.claude/` | Slash commands, incluido `/qa-init` |
| Codex | `.codex/` | Prompts de onboarding para Codex |
| OpenCode | `.opencode/` | Slash commands, incluido `/qa-init` |
| Cline | `.clinerules`, `.cline/` | Reglas y documentaci?n para Cline |
| Continue | `.continue/` | Gu?a de revisi?n y checks |
| Aider | `.aider.conf.yml`, `.aider/` | Lista de lectura y notas de comandos |
| Goose | `.goose/` | Receta reutilizable de workflow |
| Gemini CLI | `GEMINI.md` | Contexto de proyecto para Gemini CLI |

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

El init por defecto crea solo los archivos y carpetas m?nimos. No crea artefactos iniciales `qa-ai-output/*.md` salvo que pases `--with-doc-templates`, y solo genera el adaptador OpenCode salvo que `--adapters` pida m?s.

Las subcarpetas exactas de `tests/` dependen de la configuraci?n. Init crea rutas UI/API cuando hay frameworks configurados, y omite carpetas de automatizaci?n cuando los frameworks son `none` o `undecided`.

Cuando `project.interfaceLanguage` es `es`, init localiza los encabezados de los artefactos Markdown de QA. El idioma de Gherkin se controla por separado con `gherkin.language`.

## Reglas Gherkin

| Regla | Requisito |
|---|---|
| Idioma | Ingl?s (`en`) o espa?ol (`es`) desde `qa-ai.config.yaml` |
| Directiva en espa?ol | Los `.feature` en espa?ol deben incluir `# language: es` |
| Modelo de archivo | Un `.feature` por caso de prueba |
| Modelo de escenario | Una keyword de escenario configurada por archivo |
| Criterios de aceptaci?n | `Acceptance Criteria:` en ingl?s o `Criterios de aceptaci?n:` en espa?ol |
| Tags requeridos | `@priority:<valor>`, `@type:<valor>`, `@manual:<valor>` |
| Alcance | Las pruebas manuales tienen `.feature`; unit tests quedan fuera de alcance |

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
- Las carpetas se eliminan solo si est?n rastreadas y vac?as.
- La carpeta copiada `.qa-ai/` no se elimina con `clean`.

## Documentaci?n

| Documento | Prop?sito |
|---|---|
| [Primeros pasos](docs/qa-ai/getting-started.md) | Flujos de configuraci?n paso a paso por tipo de usuario |
| [QA help y tracks](docs/qa-ai/qa-help.md) | Siguiente paso contextual y profundidad del flujo (`quick` / `standard` / `enterprise`) |
| [Release gate](docs/qa-ai/release-gate.md) | Decisi?n go/no-go enterprise (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) |
| [Test design dual-mode](docs/qa-ai/test-design-dual-mode.md) | Diseno de pruebas a nivel sistema y por RF (inspirado en BMAD TEA) |
| [Soluci?n de problemas](docs/qa-ai/troubleshooting.md) | Fallos comunes y c?mo resolverlos |
| [Transcripts de terminal](docs/qa-ai/terminal-transcripts.md) | Salida real de comandos para flujos comunes |
| [Arquitectura](docs/qa-ai/architecture.md) | Estructura del framework y modelo de seguridad |
| [Workflow](docs/qa-ai/workflow.md) | Flujo QA end-to-end |
| [Compatibilidad de agentes](docs/qa-ai/agent-compatibility.md) | Adaptadores y discovery de comandos |
| [Personalizaci?n de agentes](docs/qa-ai/customizing-agents.md) | C?mo adaptar agentes, especialistas y adaptadores de forma segura |
| [Limpieza](docs/qa-ai/cleanup.md) | Detalles de limpieza basada en manifiesto |
| [Roadmap](ROADMAP.md) | Direcci?n del producto |
| [Contribuir](CONTRIBUTING.md) | Gu?a de contribuci?n |
| [Seguridad](SECURITY.md) | Pol?tica de vulnerabilidades y secretos |

## Licencia

MIT. Ver [LICENSE](LICENSE).
