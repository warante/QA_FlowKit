# Regenerar el preview RF-101

Lee `AGENTS.md`, `.qa-ai/qa-ai.config.yaml`, [el guion vigente](../demo-script.md),
[las transcripciones reales](../terminal-transcripts.md) y [el estado del vídeo](../demo.v1.json).
No copies un segundo guion aquí: `demo-script.md` es la fuente del storyboard.

## Límites

- Conserva el MP4, GIF, miniatura, audios y VTT publicados hasta la revisión y aprobación del preview.
- Etiqueta permanentemente la prueba como **PREVIEW / rendered CLI / fixture replay**.
- No simules una sesión de OpenCode, ejecución de un modelo, revisión humana independiente ni llamadas externas.
- Captura el paquete local instalado en destinos limpios con Node.js 22.18+ (24 recomendado). No afirmes haber
  verificado la versión del registro npm si solo se ha probado un tarball local.
- Mantén los binarios, dependencias Python, modelos de voz y medios temporales fuera del repositorio.

## Captura y renderizado

Desde el checkout, elige rutas nuevas externas al repositorio:

```bash
node .github/scripts/capture-onboarding.mjs --output <capture.json>
python .github/scripts/render-rf101-demo.py --capture <capture.json> --output-dir <preview-directory>
```

Instala Pillow e imageio-ffmpeg en un entorno virtual temporal si no están disponibles. El preview no requiere voz:
no anuncies pistas bilingües de audio si solo contiene texto y subtítulos. Conserva los diagnósticos, el código de
salida 1 del fallo intencionado y la advertencia de carpeta del fixture corregido.
Los campos JSON seleccionados son extractos reales; las copias de fixtures deben explicarse, no atribuirse al agente.

## Revisión antes de publicar

1. Reproduce `npm run test:e2e-quick` y los tests documentales/del producto.
2. Inspecciona fotogramas de instalación, fallo, corrección y cierre: tipografía legible, sin texto cortado ni rutas privadas.
3. Comprueba resolución, duración, códec, pistas reales y sincronización de subtítulos con las herramientas disponibles.
4. Entrega la ruta del preview y sus limitaciones. El preview no modifica el estado `published` del vídeo histórico.
5. Solo después de aprobación explícita, prepara los assets finales, revisiones de accesibilidad y audio, y actualiza
   metadatos, README y landing en una operación coordinada. No declares pilotos, live-host E2E o soak RC completados.
