# QA AI Starter

[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-green.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933.svg)](package.json)
[![Estado: MVP](https://img.shields.io/badge/estado-MVP-blue.svg)](ROADMAP.md)
[![Workflow: QA AI](https://img.shields.io/badge/workflow-QA%20AI-6f42c1.svg)](docs/qa-ai/workflow.md)

Starter open-source y portable para añadir un flujo de QA asistido por IA a un repositorio existente de QA o automatización.

Idioma: [English](README.md) | **Español**

## Tabla de Contenidos

- [Qué Hace](#qué-hace)
- [Inicio Rápido](#inicio-rápido)
- [Bootstrap Desde Agente](#bootstrap-desde-agente)
- [Comandos](#comandos)
- [Presets](#presets)
- [Adaptadores](#adaptadores)
- [Estructura Generada](#estructura-generada)
- [Reglas Gherkin](#reglas-gherkin)
- [Limpieza](#limpieza)
- [Documentación](#documentación)
- [Licencia](#licencia)

## Qué Hace

El MVP está diseñado para funcionar copiando una carpeta: copias `.qa-ai/` en un repositorio objetivo, ejecutas scripts locales de Node.js y el repositorio recibe configuración, instrucciones para agentes, documentación de workflow, scripts de validación, plantillas y adaptadores para herramientas comunes de coding agents.

El starter **no** realiza escrituras externas en herramientas configuradas durante el MVP. Solo crea artefactos locales y propuestas antes de cualquier sincronización externa.

| Área | Incluye |
|---|---|
| Framework | Carpeta portable `.qa-ai/` |
| Scripts | `bootstrap-agent-adapters`, `init`, `doctor`, `clean`, `validate-features`, `smoke-test`, `sync-agent-adapters` |
| Reglas | Aprobación, Gherkin, gestión de pruebas, automatización, UI automation y API testing |
| Agentes | Agentes por fase y especialistas activos desde `.qa-ai/agents/specialists/active.md` |
| Plantillas | Análisis de requisitos, diseño de pruebas, trazabilidad, planificación de automatización y resumen de PR |
| Adaptadores | AGENTS.md, Claude Code, Codex, OpenCode, Cline, Continue, Aider y Goose |

```text
Requisitos
  -> intake de requisitos
  -> validación de RF oficial y criterios de aceptación
  -> análisis de cobertura en gestión de pruebas
  -> diseño de pruebas Gherkin
  -> plan de sincronización con gestión de pruebas
  -> matriz de trazabilidad
  -> viabilidad de automatización
  -> plan de implementación con el framework configurado
  -> resumen listo para PR
```

## Inicio Rápido

Ejecuta esto desde el repositorio objetivo donde quieres instalar el starter:

```bash
cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai
node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --interface-language es --gherkin-language es
node .qa-ai/scripts/doctor.mjs
```

Después abre el repositorio con tu herramienta de IA y empieza con:

```text
Lee AGENTS.md, qa-ai.config.yaml y .qa-ai/workflows/full-flow.md. Sigue .qa-ai/rules/ antes de modificar archivos.
```

Los flags de framework y rutas son overrides avanzados. Si el preset ya define los frameworks que quieres, omite esos flags para conservar las rutas del preset.

## Bootstrap Desde Agente

Usa este flujo cuando Claude Code u OpenCode deban inicializar el repo mediante `/qa-init`.

| Plataforma | Comando |
|---|---|
| Unix/macOS | `cp -R /path/to/qa-ai-starter/.qa-ai .qa-ai` |
| PowerShell | `Copy-Item -Recurse -LiteralPath C:\path\to\qa-ai-starter\.qa-ai -Destination .\.qa-ai` |

Después ejecuta:

```bash
node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode
```

Abre Claude Code u OpenCode en el repositorio objetivo y ejecuta:

```text
/qa-init
```

Usa `/qa-init` en vez de `/init`; Claude Code y OpenCode ya tienen comandos internos llamados `/init`. El comando guiado pregunta idioma, preset, adaptadores, overrides opcionales de framework y comportamiento de sobrescritura.

Forma directa avanzada:

```text
/qa-init --preset webdriverio-playwright-api --interface-language es --gherkin-language es --adapters claude,opencode
```

## Comandos

| Comando | Propósito |
|---|---|
| `node .qa-ai/scripts/bootstrap-agent-adapters.mjs --agents claude,opencode` | Copia comandos slash mínimos para setup desde agente |
| `node .qa-ai/scripts/init.mjs --preset webdriverio-playwright-api --interface-language es --gherkin-language es` | Genera config, carpetas, docs y adaptadores |
| `node .qa-ai/scripts/sync-agent-adapters.mjs --adapters all` | Sincroniza adaptadores seleccionados |
| `node .qa-ai/scripts/doctor.mjs` | Revisa salud del setup |
| `node .qa-ai/scripts/validate-features.mjs` | Valida archivos `.feature` generados |
| `node .qa-ai/scripts/smoke-test.mjs` | Ejecuta smoke checks de mantenimiento |
| `node .qa-ai/scripts/clean.mjs` | Previsualiza limpieza de artefactos generados |

`init.mjs` nunca sobrescribe archivos existentes salvo que se pase `--force`. `validate-features.mjs` falla si no encuentra archivos `.feature`; usa `--allow-empty` solo para smoke checks del repo fuente u otros casos donde una carpeta vacía sea esperada.

## Presets

| Preset | Mejor Para | Automatización Por Defecto |
|---|---|---|
| `webdriverio-playwright-api` | Repositorios de QA + automatización | WebdriverIO UI/E2E y Playwright API |
| `selenium-jest-browserstack` | Automatización UI estilo Selenium | Carpetas Selenium/Jest/BrowserStack |
| `manual-only` | Diseño QA sin carpetas de automatización | Ninguna |

## Adaptadores

| Adaptador | Ruta Generada | Notas |
|---|---|---|
| Genérico | `AGENTS.md` | Reglas de seguridad y comportamiento cross-agent |
| Claude Code | `.claude/` | Slash commands, incluido `/qa-init` |
| Codex | `.codex/` | Prompts de onboarding para Codex |
| OpenCode | `.opencode/` | Slash commands, incluido `/qa-init` |
| Cline | `.clinerules`, `.cline/` | Reglas y documentación para Cline |
| Continue | `.continue/` | Guía de revisión y checks |
| Aider | `.aider.conf.yml`, `.aider/` | Lista de lectura y notas de comandos |
| Goose | `.goose/` | Receta reutilizable de workflow |

## Estructura Generada

```text
qa-ai.config.yaml
AGENTS.md
.claude/
.codex/
.opencode/
.cline/
.clinerules
.continue/
.aider.conf.yml
.aider/
.goose/
docs/qa/
features/
tests/
```

Las subcarpetas exactas de `tests/` dependen de la configuración. Init crea rutas UI/API cuando hay frameworks configurados, y omite carpetas de automatización cuando los frameworks son `none` o `undecided`.

Cuando `project.interfaceLanguage` es `es`, init localiza los encabezados de los artefactos Markdown de QA. El idioma de Gherkin se controla por separado con `gherkin.language`.

## Reglas Gherkin

| Regla | Requisito |
|---|---|
| Idioma | Inglés (`en`) o español (`es`) desde `qa-ai.config.yaml` |
| Directiva en español | Los `.feature` en español deben incluir `# language: es` |
| Modelo de archivo | Un `.feature` por caso de prueba |
| Modelo de escenario | Una keyword de escenario configurada por archivo |
| Criterios de aceptación | `Acceptance Criteria:` en inglés o `Criterios de aceptación:` en español |
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
- Las carpetas se eliminan solo si están rastreadas y vacías.
- La carpeta copiada `.qa-ai/` no se elimina con `clean`.

## Documentación

| Documento | Propósito |
|---|---|
| [Arquitectura](docs/qa-ai/architecture.md) | Estructura del framework y modelo de seguridad |
| [Workflow](docs/qa-ai/workflow.md) | Flujo QA end-to-end |
| [Compatibilidad de agentes](docs/qa-ai/agent-compatibility.md) | Adaptadores y discovery de comandos |
| [Limpieza](docs/qa-ai/cleanup.md) | Detalles de limpieza basada en manifiesto |
| [Roadmap](ROADMAP.md) | Dirección del producto |
| [Contribuir](CONTRIBUTING.md) | Guía de contribución |
| [Seguridad](SECURITY.md) | Política de vulnerabilidades y secretos |

## Licencia

MIT. Ver [LICENSE](LICENSE).
