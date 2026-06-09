# QA FlowKit

[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-green.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-339933.svg)](package.json)
[![Estado: Beta](https://img.shields.io/badge/estado-Beta-orange.svg)](docs/qa-ai/stability-policy.md)
[![CI](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml/badge.svg)](https://github.com/warante/QA_FlowKit/actions/workflows/ci.yml)
[![versión npm](https://img.shields.io/npm/v/qa-flowkit.svg)](https://www.npmjs.com/package/qa-flowkit)

Convierte el trabajo de QA asistido por IA en un workflow de repositorio repetible y revisable.

Idioma: [English](README.md) | **Español**

QA FlowKit coordina un agente de código mientras scripts deterministas controlan el proceso:

```text
requisito -> diseño de pruebas -> Gherkin -> trazabilidad -> automatización -> release gate
```

Está dirigido a equipos de QA y automatización que quieren artefactos generados con IA sin depender únicamente de la
disciplina del prompt. QA FlowKit está actualmente en fase **Beta**; consulta la
[política de estabilidad](docs/qa-ai/stability-policy.md).

## El Problema Que Resuelve

Los agentes de IA generan pruebas rápidamente, pero los equipos siguen necesitando estructura, trazabilidad,
aprobaciones y validación fiable. QA FlowKit instala esos controles dentro del repositorio destino:

- instrucciones por fase y especialistas reutilizables;
- tracks `quick`, `standard` y `enterprise`;
- estado persistente, reanudable y con registro de eventos;
- validación de Gherkin, trazabilidad, diseño de pruebas, planes de sync y release gates;
- protección frente a sobrescritura, rutas externas, borrados y secretos;
- planificación proposal-first para Jira, TestRail, Zephyr, Xray y herramientas similares.

La IA razona y edita archivos. QA FlowKit controla el orden, los artefactos obligatorios, las aprobaciones y el
resultado de las validaciones.

## Inicio En Cinco Minutos

Desde el repositorio donde quieres instalar QA FlowKit:

```bash
npx qa-flowkit@beta init --preset manual-only --qa-track quick --adapters generic
npx qa-flowkit doctor
npx qa-flowkit run start --rf RF-101
npx qa-flowkit run next
```

Abre el repositorio con tu agente y pídele que lea el paquete de fase devuelto, `AGENTS.md` y
`qa-ai.config.yaml`. Cuando cree el artefacto solicitado:

```bash
npx qa-flowkit run check
npx qa-flowkit run next
```

Repite `next -> trabajo del agente -> check` hasta completar el run y ejecuta:

```bash
npx qa-flowkit validate-target
```

El ejemplo determinista RF-101, incluido un fallo intencionado del validador y su corrección, está documentado en
[Primeros pasos](docs/qa-ai/getting-started.md#5-minute-quick-path). Desde este repositorio fuente puedes repetirlo:

```bash
npm run test:e2e-quick
```

Para ver un repositorio destino completo que instala y valida el CLI empaquetado, consulta el
[ejemplo publico manual-only](examples/manual-only/README.md):

```bash
npm run test:e2e-manual-example
```

## Qué Instala

```text
.qa-ai/               framework, reglas, agentes, workflows y validadores
qa-ai.config.yaml      configuración del repositorio destino
qa-ai-output/          análisis, planes y trazabilidad generados
features/              diseño QA manual y automatizado en Gherkin
AGENTS.md              instrucciones genéricas cuando se solicitan
```

Las carpetas de automatización y los adaptadores específicos se generan solo cuando el preset o adaptador elegido los
requiere. Los archivos existentes se omiten salvo que el usuario indique explícitamente `--force`.

## Elegir Un Track

| Track        | Cuándo usarlo                                 | Salida principal                                                           |
| ------------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| `quick`      | Cambios pequeños y QA manual                  | Requisitos, Gherkin, trazabilidad y resumen de PR                          |
| `standard`   | La mayoría de repositorios de automatización  | Diseño completo, gestión de pruebas, viabilidad e implementación           |
| `enterprise` | Gobierno formal, auditoría o release regulado | Workflow standard más validación estricta y decisión de calidad de release |

El track controla la profundidad; los presets configuran frameworks y herramientas.

## Presets

| Preset                       | Track habitual | Automatización               |
| ---------------------------- | -------------- | ---------------------------- |
| `manual-only`                | `quick`        | Ninguna                      |
| `playwright-full`            | `standard`     | Playwright UI + API          |
| `maestro-karate-mobile`      | `standard`     | Maestro mobile + Karate API  |
| `karate-full`                | `standard`     | Karate API + UI              |
| `webdriverio-playwright-api` | `standard`     | Compatibilidad beta heredada |
| `selenium-jest-browserstack` | `standard`     | Selenium/Jest                |

Ejemplo:

```bash
npx qa-flowkit@beta init --preset karate-full --adapters generic,claude
```

Consulta el [esquema de configuración](docs/qa-ai/config-schema.md).

## Comandos Principales

| Comando                             | Propósito                                        |
| ----------------------------------- | ------------------------------------------------ |
| `qa-flowkit init`                   | Instalar y configurar el framework               |
| `qa-flowkit update`                 | Actualizar `.qa-ai/` conservando el estado       |
| `qa-flowkit doctor`                 | Diagnosticar instalación y configuración         |
| `qa-flowkit help`                   | Recomendar el siguiente paso del workflow        |
| `qa-flowkit run start\|next\|check` | Ejecutar un workflow controlado y reanudable     |
| `qa-flowkit validate-target`        | Ejecutar el quality gate del repositorio destino |
| `qa-flowkit validate-features`      | Validar el Gherkin de diseño QA                  |
| `qa-flowkit validate-traceability`  | Validar cobertura entre RF y pruebas             |
| `qa-flowkit validate-release-gate`  | Validar la decisión enterprise de release        |

La referencia completa está en [Referencia CLI](docs/qa-ai/cli-reference.md).

## Reglas Deterministas

QA FlowKit valida, entre otras cosas:

- Gherkin en inglés o español según configuración;
- un archivo `.feature` por caso de prueba;
- pruebas manuales también representadas como `.feature`;
- bloques de criterios de aceptación;
- tags obligatorios `@priority:`, `@type:` y `@manual:`;
- trazabilidad con RF oficial e IDs de test duplicados;
- lenguaje proposal-first en planes de sincronización;
- evidencias obligatorias del release gate enterprise.

Consulta las [reglas Gherkin](.qa-ai/rules/gherkin.rules.md) y el
[índice de reglas](.qa-ai/rules/README.md).

## Agentes Y Adaptadores

El contrato genérico `AGENTS.md` funciona con cualquier agente capaz de leer el repositorio. También hay plantillas
para:

- Claude Code;
- Codex Desktop;
- OpenCode;
- Cline;
- Continue;
- Aider;
- Goose;
- Gemini CLI.

Los adaptadores usan preguntas estructuradas cuando el host las expone y opciones numeradas en caso contrario. El
idioma de interfaz procede de `project.interfaceLanguage`; `gherkin.language` solo controla los `.feature`.

La generación de adaptadores se prueba automáticamente. Los niveles de verificación en hosts reales se documentan
por separado y no equivalen a aislamiento del shell. Consulta
[Compatibilidad de agentes](docs/qa-ai/agent-compatibility.md).

## Seguridad Y Límites

QA FlowKit:

- mantiene estado y artefactos dentro del repositorio;
- rechaza rutas configuradas que escapen del repositorio;
- exige aprobación específica para modificar outputs preexistentes;
- deniega escrituras externas y borrados en el contrato actual;
- escanea artefactos QA en busca de valores parecidos a secretos durante la validación estricta.

No aloja ni ejecuta un modelo de IA. Un agente con acceso libre al shell puede operar fuera del harness; consulta
[Arnés para agentes](docs/qa-ai/agent-harness.md) para conocer el límite exacto.

## Actualización

```bash
npx qa-flowkit@beta update
npx qa-flowkit doctor --strict
npx qa-flowkit validate-target
```

`update` sustituye el framework conservando `.qa-ai/state/`, perfiles y artefactos del usuario fuera de `.qa-ai/`.
Consulta la [guía de actualización](docs/qa-ai/getting-started.md#upgrading-an-existing-target).

## Documentación

| Tema                    | Documento                                                 |
| ----------------------- | --------------------------------------------------------- |
| Primer workflow         | [Primeros pasos](docs/qa-ai/getting-started.md)           |
| Comandos y opciones CLI | [Referencia CLI](docs/qa-ai/cli-reference.md)             |
| Arquitectura            | [Arquitectura](docs/qa-ai/architecture.md)                |
| Workflow                | [Workflow completo](docs/qa-ai/workflow.md)               |
| Harness reanudable      | [Arnés para agentes](docs/qa-ai/agent-harness.md)         |
| Solución de problemas   | [Troubleshooting](docs/qa-ai/troubleshooting.md)          |
| Estabilidad             | [Política de estabilidad](docs/qa-ai/stability-policy.md) |
| Contratos públicos      | [Inventario de contratos](docs/qa-ai/public-contracts.md) |
| Medición de pilotos     | [Metodología de pilotos](docs/qa-ai/pilot-methodology.md) |
| Camino a 1.0            | [Roadmap](ROADMAP.md) y [tareas](tasks/README.md)         |
| Seguridad               | [Política de seguridad](SECURITY.md)                      |
| Contribución            | [Guía de contribución](CONTRIBUTING.md)                   |

## Repositorio Fuente

Este repositorio mantiene el framework, CLI, CI y paquete npm. Un repositorio QA destino recibe `.qa-ai/`,
configuración y artefactos mediante `npx qa-flowkit init`.

Antes de proponer un PR:

```bash
npm ci
npm run lint
npm run format:check
npm run docs:check
npm run validate:oss-extraction
node .github/scripts/verify-npm-pack.mjs
```

Las releases usan release-please. No actualices versiones manualmente, publiques localmente ni crees tags de release.
Consulta la [checklist de release](docs/qa-ai/release-checklist.md).

## Licencia

[MIT](LICENSE)
