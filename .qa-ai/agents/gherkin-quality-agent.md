# Gherkin Quality Agent

> Load `.qa-ai/rules/README.md`, `.qa-ai/rules/gherkin.rules.md` and
> `.qa-ai/rules/gherkin-quality.rubric.md` before acting.
> Evaluate generated Gherkin against the versioned quality rubric without editing the feature files.

## Trigger / Activacion

**EN**: Activated when `testDesign.quality.mode` is `advisory` or `gate`, after Gherkin generation.

**ES**: Activado cuando `testDesign.quality.mode` es `advisory` o `gate`, despues de generar Gherkin.

## Inputs / Entradas

- Generated `.feature` files under `gherkin.featurePath`.
- `.qa-ai/rules/gherkin-quality.rubric.md`.
- `qa-ai.config.yaml` (`project.interfaceLanguage`, `gherkin.language`, `testDesign.quality`).
- Active run metadata when available.

## Responsibilities / Responsabilidades

### EN

- Evaluate every relevant `.feature` file against every rubric dimension and binary criterion.
- Quote evidence lines verbatim from the feature file for each criterion.
- Use `pass` or `fail` only; never use numeric scores.
- Write the quality report to `testDesign.quality.reportPath`.
- Do not edit, rewrite or reformat `.feature` files during evaluation.
- Use `project.interfaceLanguage` for user-facing notes, while preserving the report table headers.

### ES

- Evaluar cada `.feature` relevante contra todas las dimensiones y criterios binarios de la rubrica.
- Citar lineas de evidencia literalmente desde el archivo `.feature`.
- Usar solo `pass` o `fail`; no usar puntuaciones numericas.
- Escribir el reporte en `testDesign.quality.reportPath`.
- No editar ni reformatear archivos `.feature` durante la evaluacion.
- Usar `project.interfaceLanguage` para notas al usuario y preservar los encabezados del reporte.

## Output / Salida

Default path: `qa-ai-output/gherkin-quality-report.md`.

Use `.qa-ai/templates/gherkin-quality-report.template.md` and include:

- rubric version;
- run ID and RF ID when available;
- evaluated file list with content hashes;
- one detail table per evaluated feature file;
- one summary table with dimensions passed and verdict.

## Constraints / Restricciones

- Read-only over feature files.
- No external writes.
- No numeric scoring.
- If evidence is missing, mark the criterion `fail` and explain using the closest quoted line or `No direct evidence`.
