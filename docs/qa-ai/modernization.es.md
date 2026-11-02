# Modernización para agentes actuales

QA FlowKit controla requisitos, trazabilidad y evidencia; no sustituye al agente ni al ejecutor de pruebas.
Puede complementar los agentes de Playwright. Un informe bien formado no demuestra que los tests comprueben
correctamente el comportamiento esperado.

## Runtime e integración

Se requiere Node.js 22.18+; se recomienda Node.js 24. CI cubre Node 22/24 en Ubuntu y Windows.
Node 20 queda fuera de soporte. Actualiza Node antes de actualizar FlowKit; no necesitas migrar la configuración.

Sincroniza solo el adaptador que utilizas:

```bash
node .qa-ai/scripts/sync-agent-adapters.mjs --adapters codex
```

La skill `qa-flowkit` se instala en la ruta nativa de Claude, Codex u OpenCode y carga la guía de la fase bajo demanda.
La skill reduce el contexto inicial, no el paquete npm. La instalación completa conserva todo el runtime;
la selección explícita de módulos permite omitir implementaciones opcionales.
Los comandos y el plugin existentes siguen disponibles.

Los hooks de Codex son opcionales: añade `--hooks` y revísalos y confía en ellos mediante `/hooks` en Codex.
Los archivos existentes se conservan; `--hooks --force` mezcla los handlers de FlowKit sin eliminar los del usuario.
OpenCode V2 dispone ahora de un plugin local opcional de FlowKit, descrito más abajo.
Consulta la [compatibilidad de agentes](agent-compatibility.md).

## Evidencia ligada al commit

La comprobación es opcional y está desactivada por defecto. Añade estos campos bajo `execution`, conservando
los comandos y la configuración de cuarentena existentes:

```yaml
execution:
  resultsPaths:
    - test-results/junit.xml
  provenance:
    mode: strict
    manifestPath: .qa-ai/output/execution-provenance.json
    environment: ci
    maxAgeHours: 24
```

Haz commit de la configuración y del código/tests antes de ejecutar:

```bash
npx qa-flowkit execute --record-evidence
npx qa-flowkit validate-execution-evidence --json
```

Para reemplazar un registro anterior usa explícitamente `--record-evidence --force`. Un dry-run no escribe archivos.
El registro pasa a `running` antes de ejecutar: una interrupción o una ejecución fallida no deja un éxito anterior
aparentando corresponder a la nueva ejecución. Guarda IDs/estados, no la salida de comandos ni credenciales.

El modo estricto exige todos los comandos requeridos correctos, el mismo commit y hash de configuración,
árbol de fuentes limpio, entorno coincidente, fechas válidas y recientes, resultados renovados durante esa ejecución
y coincidencia exacta de archivos y hashes SHA-256. Los gates de release usan el mismo validador.

Los resultados y el registro deben estar ignorados o sin seguimiento; el runner no debe modificar archivos versionados.
Los archivos sin seguimiento fuera de los patrones de resultados, del registro y de `.qa-ai/state/` ensucian el árbol.
Los archivos ignorados por Git no se verifican como fuentes. El entorno es una etiqueta, no una verificación de la
infraestructura. No uses globs que incluyan el propio registro de procedencia.

`advisory` emite advertencias; `off` conserva el comportamiento anterior. `--allow-missing` no evita el modo estricto.
Conserva registro y resultados como artefactos de CI del mismo commit. El JSON local no es una atestación firmada
ni una barrera frente a un agente con shell irrestricto que cambie validadores, configuración o registros.

## Hallazgos de validación en SARIF

`npx qa-flowkit validate-target --sarif` genera SARIF 2.1.0 en stdout, con los mismos códigos de salida de validación.
Incluye hallazgos de validadores, no resultados de ejecución de tests. No sube nada a GitHub ni concede permisos.
Las rutas son relativas y los patrones conocidos de credenciales se redactan; revisa el informe antes de compartirlo.
Consulta la [guía SARIF](sarif.md) para guardar el archivo de forma segura y consumirlo en CI.

## Resúmenes de impacto por PR

`npx qa-flowkit pr-summary --base origin/main` resume el diff de commits de la PR, vínculos exactos de trazabilidad,
IDs de tests para revisar y archivos sin vínculo. Markdown sigue el idioma configurado; `--json` genera datos
estructurados. No ejecuta tests, no deduce cobertura ni crea una PR. Guardar un archivo es opcional y requiere
`--force` para reemplazarlo. Consulta los [detalles y límites](pr-impact-summary.md).

## Instalación selectiva de módulos

`npx qa-flowkit init --modules core,adapter-codex` copia solo el núcleo y los recursos opcionales seleccionados.
La instalación completa sigue siendo la predeterminada. El núcleo conserva los puntos de entrada de validación,
reglas y agentes. Los módulos `runtime-automation`, `runtime-reporting`, `runtime-observability` y
`runtime-development` separan implementaciones, informes, conectores y tests del framework. Un runtime configurado
pero ausente hace fallar la validación con instrucciones de instalación; nunca la omite silenciosamente.
`automation-presets` añade automáticamente `runtime-automation`. Los registros de instalación v1 conservan todos
los runtimes al migrar a v2 para no perder capacidades.
Las actualizaciones conservan o amplían la selección, sin retirar archivos, y protegen cambios locales salvo
`--force`. El paquete npm sigue siendo único. Consulta los [límites y la guía modular](modular-installation.md).

## Plugin de OpenCode V2

`npx qa-flowkit sync-adapters --adapters opencode --opencode-plugin` genera el plugin local tras una petición explícita.
Revisa sus archivos y la dependencia fijada del SDK 2.2.4 antes de confiar en él. Comprueba los artefactos después
de las operaciones y devuelve diagnósticos si fallan; la operación ya ha ocurrido y no se revierte. El hook
`experimental.idle` solicita como máximo una continuación de verificación por prompt, aislada por sesión. No es
una sandbox, una aprobación de gate ni una certificación E2E real. Consulta la [guía técnica](opencode-v2-plugin.md).

## Validación pendiente

Estos cambios no certifican E2E en hosts reales ni completan pilotos, revisión independiente, recorrido de migración
o soak RC. Es necesario registrar evidencia real, con versiones y fechas, antes de cambiar esos estados.

Las siguientes prioridades son pilotos medidos, evidencia en hosts reales y evaluación
semántica revisada por personas usando el dataset existente. Detalles técnicos: [guía en inglés](modernization.md).
