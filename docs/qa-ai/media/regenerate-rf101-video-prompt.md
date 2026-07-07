# Prompt maestro para regenerar el vídeo RF-101

Usa este prompt con un agente que pueda ejecutar comandos, generar audio y editar archivos en el repositorio de
QA FlowKit. Sustituye los bloques marcados como `<NUEVO_...>` antes de comenzar.

---

## Prompt

Trabaja en el repositorio **QA FlowKit** y regenera completamente el vídeo de demostración RF-101 a partir del
nuevo guion proporcionado más abajo. Lee primero `AGENTS.md`, `qa-ai.config.yaml` y estas fuentes de contexto:

- `docs/qa-ai/demo-script.md`
- `docs/qa-ai/demo-transcript.md`
- `docs/qa-ai/demo.md`
- `docs/qa-ai/demo.v1.json`
- `.github/scripts/render-rf101-demo.py`
- `.github/scripts/run-quick-path-validation.mjs`
- `test/fixtures/quick-path/`

No modifiques ni reemplaces el vídeo definitivo hasta haber generado y validado un preview. No añadas modelos de
voz, binarios de FFmpeg, entornos Python ni archivos temporales al repositorio.

### Nuevo guion

````text
# RF-101 Demo Recording Script

Use this script to record a **two-minute-or-shorter** terminal demo for TASK-057. The story matches
`[demo.md](../demo.md)`, `[getting-started.md](../getting-started.md)` and `npm run test:e2e-quick`.

## Goal

Show one requirement flowing through the quick track — generated artifacts, a deterministic validator failure, a
correction and a passing target gate — driven entirely by framework slash commands inside OpenCode. No manual `node`
invocations; only `npx qa-flowkit` for the initial install.

## Prerequisites

- Node.js 20+ and a clean terminal at 1080p or higher.
- QA FlowKit source checkout or packed CLI on the `rc` channel.
- OpenCode installed and available in the PATH (`opencode`).
- Empty temporary directory for the target repository.
- Hide shell prompts that expose usernames or local paths when possible.



## Recording setup

1. Increase terminal font size for readability.
2. Use a dark theme with high contrast.
3. Clear scrollback before each scene.
4. Keep total runtime under **120 seconds**; prefer fewer commands over exhaustive narration.



## Scene 1 — Install and guided init (0:00–0:20)

**Say:** "RF-101 is a login requirement. QA FlowKit installs in one command and guides you through init with slash commands."

```bash
mkdir /tmp/rf101-demo && cd /tmp/rf101-demo
npx qa-flowkit
````

**Show:** the TUI adapter selector. Choose `opencode` or your favorite cli.

```bash
opencode
```

Inside OpenCode, run the guided initialization:

```text
/qa-init
```

Answer the guided questions:

- Interface language: `1. English`
- Project name: `rf101-demo`
- Gherkin language: `1. English`
- Base template: `1. Manual only`
- Requirements source: `1. Markdown`
- Test management: `1. None`
- Issue tracker: `1. None`
- Adapters: `opencode`

**Show:** init summary with `doctor` passing, what was created, and suggested next steps.

Copy the public requirement from `[test/fixtures/quick-path/requirements/RF-101-login.md](../../../test/fixtures/quick-path/requirements/RF-101-login.md)`
into `requirements/RF-101-login.md`. Show the file in a second pane or editor.

## Scene 2 — Full flow: analysis and artifacts (0:20–0:45)

**Say:** "One slash command drives the entire workflow. The agent reads the requirement, produces analysis artifacts, and runs deterministic validation at each phase."

Inside OpenCode:

```text
/qa-full-flow
```

**Agent asks:** Where is the requirement source?
**Answer:** `requirements/RF-101-login.md`

**Agent asks:** What is the official RF ID?
**Answer:** `RF-101`

**Agent asks:** Test management project/suite?
**Answer:** `None — quick track`

**Show:** the agent producing artifacts under `qa-ai-output/`:

- `requirement-analysis.md`
- `normalized-requirements.md`

**Show:** `run check` passing in the agent's terminal output — `"ok": true`.

## Scene 3 — Intentional validator failure (0:45–1:10)

**Say:** "If a required Gherkin tag is missing, the gate fails and keeps the phase active. No restart needed."

Before the agent generates the `.feature` file, place the invalid fixture in a second terminal or editor:

Copy from `[test/fixtures/quick-path/invalid/](../../../test/fixtures/quick-path/invalid/)` — a `.feature` file **without** `@manual:true`:

```text
features/functional/RF-101-TC-001-login.feature
```

When the agent reaches the Gherkin validation phase, `run check` fails.

**Show:** non-zero exit and output mentioning `@manual:true` is required. The agent reports:

> Validation blocked. The feature file is missing `@manual:true`. Add the tag and I'll retry.

**Say:** "The run stays on the Gherkin phase. State persists."

## Scene 4 — Correction, traceability and completion (1:10–1:40)

**Say:** "After correction, the same run resumes without restarting."

Replace the feature with the corrected fixture
(`[test/fixtures/quick-path/expected/features/functional/RF-101-TC-001-login.feature](../../../test/fixtures/quick-path/expected/features/functional/RF-101-TC-001-login.feature)`).

Tell the agent: `Fixed — retry validation.` (or the agent detects the change and retries automatically).

**Show:** `run check` passing — `"ok": true`.

**Agent continues** the quick-track workflow:

- Generates `traceability-matrix.md`
- Generates `pr-summary.md`

**Show:** run status `completed` in the agent's output.

## Scene 5 — Target validation and closing (1:40–2:00)

**Say:** "The repository quality gate validates the full target state."

The agent runs the final gate and reports success. Optionally, the presenter can also run:

```text
/qa-status
```

**Show:** zero exit code and the final artifact tree under `qa-ai-output/` and `features/`.

## Closing (1:55–2:00)

**Say:** "The entire workflow ran from OpenCode slash commands. No manual `node` invocations. Replay this path from the QA FlowKit source repository with `npm run test:e2e-quick`, or read the static walkthrough in `docs/qa-ai/demo.md`."

**Do not claim:** automatic Jira/TestRail writes, guaranteed model execution or productivity guarantees.

## Replay without recording

From the QA FlowKit source repository:

```bash
npm run test:e2e-quick
```

PowerShell uses the same command. Fixture root: `[test/fixtures/quick-path/](../../../test/fixtures/quick-path/)`.

````

Si el guion solo está disponible en un idioma, crea una traducción natural y fiel para el otro. Las narraciones y
los subtítulos deben expresar el mismo contenido, pero pueden usar redacciones ligeramente distintas para sonar
naturales y caber en cada escena. No traduzcas literalmente comandos, nombres de archivo, etiquetas Gherkin ni
identificadores como `RF-101`, `TC-001`, `@manual:true` o `validate-target`.

### Resultado requerido

Genera estos archivos bajo `docs/qa-ai/media/`:

```text
qa-flowkit-rf101-demo.mp4
qa-flowkit-rf101-demo.gif
qa-flowkit-rf101-demo-thumbnail.png
qa-flowkit-rf101-demo.en.vtt
qa-flowkit-rf101-demo.es.vtt
````

El MP4 debe contener:

1. Vídeo H.264, 1920×1080, 30 fps, formato de píxel `yuv420p`.
2. Pista de audio 1: inglés, AAC, mono, etiquetada `eng` / `English` y marcada como predeterminada.
3. Pista de audio 2: español, AAC, mono, etiquetada `spa` / `Español` y no predeterminada.
4. Duración objetivo de aproximadamente **1:55** y límite absoluto de **2:00**.
5. Inicio rápido para reproducción web mediante `+faststart`.

Mantén además las pistas VTT externas en inglés y español. El reproductor puede no mostrar un selector de audio;
comprueba las dos pistas con VLC o mediante selección explícita de streams en FFmpeg.

### Estructura temporal

Divide el guion en escenas con tiempos explícitos. Puedes ajustar esta distribución si el nuevo contenido lo exige,
pero el total no debe superar 120 segundos:

| Escena | Tiempo orientativo | Contenido                                        |
| -----: | -----------------: | ------------------------------------------------ |
|      1 |          0:00–0:06 | Apertura y propuesta de valor                    |
|      2 |          0:06–0:14 | Instalación e inicialización                     |
|      3 |          0:14–0:22 | Inicio de una ejecución reanudable               |
|      4 |          0:22–0:30 | Requisito fuente                                 |
|      5 |          0:30–0:38 | Verificación determinista de fase                |
|      6 |          0:38–0:46 | Punto de aprobación humana                       |
|      7 |          0:46–0:55 | Defecto intencional                              |
|      8 |          0:55–1:05 | Rechazo del validador                            |
|      9 |          1:05–1:14 | Corrección y reanudación                         |
|     10 |          1:14–1:22 | Mismo control aprobado                           |
|     11 |          1:22–1:31 | Trazabilidad                                     |
|     12 |          1:31–1:39 | Ejecución completada                             |
|     13 |          1:39–1:48 | Validación completa del repositorio              |
|     14 |          1:48–1:55 | Cierre y llamada a reproducir la ruta verificada |

Para cada escena define en el renderizador:

```text
start, end, label, terminal lines, narration_en, narration_es, subtitle_en, subtitle_es
```

Los VTT deben usar exactamente los mismos límites `start/end` y contener un bloque por escena.

### Veracidad del contenido

Ejecuta primero:

```bash
npm run test:e2e-quick
```

Usa su resultado y los fixtures como fuente de verdad. No inventes comandos, JSON, errores ni estados. Si simplificas
una salida para que sea legible, conserva nombres de fase, códigos de salida y significado reales.

El vídeo debe demostrar este arco narrativo o el equivalente aprobado en el nuevo guion:

```text
requisito oficial
  → flujo gobernado y reanudable
  → artefactos de análisis
  → fallo determinista por una regla incumplida
  → corrección sin reiniciar
  → trazabilidad
  → estado completado
  → validate-target aprobado
```

No afirmes ni sugieras:

- escrituras automáticas en Jira, TestRail, Zephyr o Xray;
- ejecución garantizada de un modelo o LLM dentro de QA FlowKit;
- garantías de seguridad, productividad o cobertura total;
- uso de credenciales o servicios externos durante la demo.

### Composición visual

Reutiliza o adapta `.github/scripts/render-rf101-demo.py` y conserva el estilo visual actual:

- lienzo 1920×1080 con fondo oscuro de alto contraste;
- marca `QA FLOWKIT` y título de la demo en la cabecera;
- indicador visible `NO EXTERNAL WRITES`;
- barra de progreso basada en el final de cada escena;
- ventana de terminal con comandos en cian, aprobaciones en verde y errores en rojo;
- texto monoespaciado grande y legible a media resolución;
- panel inferior de subtítulo visible; en la versión actual muestra español;
- portada, escenas de terminal y cierre con llamada a la acción;
- no mostrar usuarios, rutas personales, claves, tokens ni nombres de máquinas.

Usa marcadores ASCII como `[pass]` y `[fail]`; evita glifos que puedan renderizarse como cuadrados en fuentes de
terminal. Inspecciona visualmente al menos portada, instalación, fallo, corrección, validación final y cierre.

Renderiza escenas estáticas o animación mínima con Pillow y ensámblalas mediante FFmpeg. La técnica actual usa un
fotograma PNG por escena y un manifiesto concat con su duración. Codifica el resultado con parámetros equivalentes a:

```bash
ffmpeg -f concat -safe 0 -i frames.txt -i narration-en.wav \
  -vf "fps=30,format=yuv420p" \
  -c:v libx264 -preset medium -crf 20 \
  -c:a aac -b:a 128k -movflags +faststart
```

### Audio bilingüe con Kokoro

Usa Kokoro de manera local y aislada:

- modelo oficial Kokoro-82M: Apache 2.0;
- wrapper `kokoro-onnx`: MIT;
- voz inglesa: `af_heart` con idioma `en-us`;
- voz española: `ef_dora` con idioma `es`;
- salida intermedia: WAV PCM de 16 bits, mono, 24 kHz;
- los modelos, voces y dependencias deben vivir en un directorio temporal, nunca en Git.

En Windows, ejecuta cada escena de Kokoro en un proceso independiente. El runtime ONNX cuantizado puede volverse
inestable después de varias inferencias consecutivas dentro del mismo proceso. Genera clips con una estructura como:

```text
<TEMP>/clips-en/scene-00/af_heart.wav
<TEMP>/clips-en/scene-01/af_heart.wav
...
<TEMP>/clips-es/scene-00/ef_dora.wav
<TEMP>/clips-es/scene-01/ef_dora.wav
...
```

Empieza cada clip aproximadamente **0,5 segundos** después del inicio de su escena. Antes de mezclar, calcula para
cada WAV:

```text
duración_del_clip <= duración_de_la_escena - 0,5 s
```

Si no cabe:

1. acorta la frase sin cambiar su significado;
2. si aún no cabe, aumenta solo esa voz entre `1.05×` y `1.15×`;
3. vuelve a medir;
4. nunca cortes audio ni permitas solapamientos entre narradores.

Construye dos WAV maestros con silencio entre escenas y duración idéntica a la del vídeo. Usa el inglés para el
primer render y añade después el español sin recodificar la imagen:

```bash
ffmpeg -i video-with-english.mp4 -i narration-es.wav \
  -map 0:v:0 -map 0:a:0 -map 1:a:0 \
  -c:v copy -c:a:0 copy -c:a:1 aac -b:a:1 128k \
  -metadata:s:a:0 language=eng -metadata:s:a:0 title=English \
  -disposition:a:0 default \
  -metadata:s:a:1 language=spa -metadata:s:a:1 title=Español \
  -disposition:a:1 0 -movflags +faststart output-bilingual.mp4
```

No reemplaces el MP4 definitivo hasta validar el bilingüe temporal.

### Subtítulos

Genera WebVTT UTF-8 con esta estructura:

```text
WEBVTT

00:00:00.000 --> 00:00:06.000
Texto del primer subtítulo.
```

Requisitos:

- una pista `.en.vtt` y otra `.es.vtt`;
- mismo número de cues y mismos tiempos;
- texto natural, legible y sincronizado con cada escena;
- máximo aproximado de dos líneas por cue;
- sin traducción de comandos o identificadores técnicos;
- comprobar que el primer marcador es `00:00:00.000` y que el último no supera la duración del MP4.

### GIF y miniatura

Genera:

- miniatura PNG 1920×1080 a partir de la portada;
- GIF 960×540, 8 fps, en bucle;
- el GIF debe centrarse en el momento con mayor valor visual, normalmente fallo → corrección → aprobado;
- usa `palettegen` y `paletteuse` para mantener un archivo pequeño y colores estables;
- objetivo orientativo: GIF menor de 2 MB y MP4 menor de 20 MB.

### Validación obligatoria

Antes de reemplazar los archivos del repositorio:

1. Ejecuta `npm run test:e2e-quick` y `npm run test:product-demo`.
2. Decodifica el vídeo completo con FFmpeg usando `-v error`.
3. Decodifica cada audio por separado con `-map 0:a:0` y `-map 0:a:1`.
4. Confirma mediante la salida de FFmpeg:
   - vídeo 1920×1080, 30 fps, H.264;
   - dos audios AAC;
   - `eng/English` predeterminado;
   - `spa/Español` alternativo;
   - misma duración para vídeo y audios.
5. Cuenta los cues de ambos VTT y confirma que coinciden con el número de escenas.
6. Inspecciona visualmente fotogramas representativos a resolución completa y media.
7. Comprueba `git diff --check`.
8. Copia el preview validado sobre el archivo final y compara los hashes SHA-256 de origen y destino.
9. No añadas al commit archivos temporales, modelos, voces, cachés Python ni herramientas descargadas.

Entrega un resumen final con rutas de los cinco medios, duración, resolución, voces, idiomas, tamaño y comandos de
validación ejecutados. Indica claramente cualquier diferencia entre el nuevo guion y los outputs reales del producto.
