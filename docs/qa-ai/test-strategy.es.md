# Estrategia basada en resultados y análisis local

La [guía incluida en el paquete](../../.qa-ai/docs/test-strategy-guide.md) explica la aclaración por contraste,
los oráculos observables, el rediseño antes de automatizar, la evaluación del beneficio, la matriz ACC y el mantenimiento.
Son mejoras opcionales y orientativas: no añaden fases obligatorias, claves públicas de configuración, tipos Gherkin
ni controles automáticos que certifiquen la corrección semántica.

Ejecutar dentro de un repositorio inicializado:

```bash
node .qa-ai/scripts/analyze-test-strategy.mjs --json
node .qa-ai/scripts/analyze-test-strategy.mjs --maintenance --results observations.json --json
```

La herramienta lee artefactos locales, títulos de Feature y, opcionalmente, historial Git acotado y resultados aportados.
No cambia tests, trazabilidad, cuarentena ni sistemas externos. Los artefactos existentes sin las nuevas secciones
siguen siendo válidos. Un aviso estructural no demuestra corrección semántica, inestabilidad, aprobación humana ni
beneficio de negocio.

Comprobaciones de desarrollo:

```bash
npm run test:strategy-analysis
npm run test:strategy-evaluation
```

La evaluación compara tablas sintéticas iniciales y revisadas, con sus limitaciones explícitas en el informe JSON.
Un oráculo deliberadamente incorrecto pero completo muestra por qué rellenar campos no sustituye la revisión.
La aceptación semántica independiente y los pilotos quedan al final de la secuencia de implementación.

Para registrar revisiones comparativas aportadas, sin generar opiniones sintéticas:

```bash
node .qa-ai/scripts/review-test-strategy.mjs --plan review-plan.json --json
node .qa-ai/scripts/review-test-strategy.mjs --plan review-plan.json --reviews review-records.json --json
```

La [guía incluida](../../.qa-ai/docs/test-strategy-guide.md#supplied-comparative-review-evidence) explica las plantillas,
los hashes, cinco dimensiones de revisión, notas separadas y tratamiento de discrepancias. Sin revisores, sigue pendiente.
`recorded-retain` solo resume evidencias aportadas; se conserva `acceptanceGranted: false` y no se verifican identidades
ni independencia. No se generan opiniones humanas, aprobación ni mediciones de productividad.

Consultar el [plan de incorporación](../../tasks/PRODUCT-STRATEGY-INCORPORATION.md) y la
[cola final de aceptación](../../tasks/FINAL-ACCEPTANCE.md).
