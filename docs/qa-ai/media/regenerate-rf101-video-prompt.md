# Regenerar el tutorial centrado en el agente

## Recorrido obligatorio

Lee `AGENTS.md`, `.qa-ai/qa-ai.config.yaml`, [la guía rápida](../getting-started.es.md),
[el guion](../demo-script.md) y [el storyboard bilingüe](../agent-first-storyboard.v1.json).

La terminal solo muestra la instalación. Todo lo demás se explica **dentro del CLI del modelo** mediante comandos
barra: `/qa-init`, `/qa-doctor`, `/qa-help`, `/qa-full-flow`, `/qa-validate-features` y `/qa-status`.
El ejemplo de contexto es `/qa-init --qa-context qa-ai-knowledge`, nunca el script interno como camino principal.
Los scripts siguen siendo alternativas válidas de CI, diagnóstico y mantenimiento, separadas de la guía rápida.

## Generar la versión de revisión

Usa un entorno Python 3.12 externo al repositorio para `piper-tts`, `kokoro-onnx` y `soundfile`.
Para renderizar necesitas Pillow e imageio-ffmpeg. Los modelos y las voces también quedan fuera del repositorio.
La voz aprobada de castellano es **Piper `es_ES-sharvard-medium`, hablante `F`**; la inglesa es Kokoro `af_heart`.
No uses las voces SAPI de Windows ni las voces españolas genéricas de Kokoro descartadas por su acento.

Primero genera los clips de narración en un directorio nuevo:

```bash
python .github/scripts/synthesize-agent-first-audio.py --storyboard docs/qa-ai/agent-first-storyboard.v1.json --spanish-model <es_ES-sharvard-medium.onnx> --english-model <kokoro-v1.0.onnx> --english-voices <voices-v1.0.bin> --output-dir <new-narration-directory>
```

El modelo español necesita su archivo `.onnx.json` contiguo. La ficha del modelo y la atribución del corpus están en
[Hugging Face](https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD) y
[SHARVARD](https://datashare.ed.ac.uk/handle/10283/574) (CC BY 3.0). Conserva esta procedencia al distribuir la narración.
El helper registra voces, hashes de modelos/clips y el texto pronunciado en `narration.json`; solo adapta la lectura
de siglas y comandos, no su significado. Después renderiza en otro directorio nuevo:

```bash
python .github/scripts/render-agent-first-demo.py --storyboard docs/qa-ai/agent-first-storyboard.v1.json --narration-dir <new-narration-directory> --output-dir <new-external-preview-directory>
```

Se generan MP4 H.264 a 1080p, dos pistas AAC (español predeterminado e inglés), subtítulos incrustados y VTT externos,
miniatura y GIF de revisión. También se exportan `agent-first.es.mp4` y `agent-first.en.mp4`, con una sola pista cada
uno, para reproductores que no permiten cambiar el idioma. En el MP4 bilingüe selecciona la pista en el menú de audio.
La narración no se recorta: si supera una escena, el renderer falla para que se corrija
el texto o el tiempo. No añadas entornos, binarios ni audio temporal al repositorio.

## Honestidad del material

- Es una **guía visual ilustrada**, no una sesión grabada del modelo. Mantén la etiqueta visible.
- Muestra comandos del usuario y notas didácticas; no inventes respuestas del agente ni resultados de validación.
- No uses la captura CLI de fixtures como tutorial de uso. El helper `render-rf101-demo.py --capture` queda únicamente
  para inspección técnica del replay determinista, no para producir este tutorial.
- No afirmes que hubo ejecución de modelos, aprobación humana, tests de login ejecutados o escrituras externas.

## Revisar antes de sustituir los medios publicados

1. Revisa las guías y verifica que los comandos mostrados existen en los adaptadores canónicos.
2. Inspecciona los fotogramas de instalación, configuración, contexto, trabajo y cierre; no debe haber scripts internos
   tras la instalación, texto cortado ni mensajes que parezcan respuestas reales del modelo.
3. Decodifica el vídeo completo y comprueba resolución, duración, dos pistas de audio, idiomas y subtítulos.
4. Escucha ambas narraciones y revisa su sincronización. Si no se ha hecho una escucha humana, declárala pendiente.
5. Entrega el preview. Conserva MP4, GIF, miniatura y VTT publicados hasta obtener aprobación de sustitución.
6. Solo tras aprobarlo, actualiza conjuntamente assets, metadatos, README y landing. Esto no certifica live-host E2E,
   pilotos ni readiness de release.
