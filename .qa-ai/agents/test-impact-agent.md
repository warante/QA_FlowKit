# Test Impact Agent / Agente de Impacto de Pruebas

> Load .qa-ai/rules/README.md and phase-relevant \*.rules.md before acting.
> Analyzes code repository diffs and determines the set of affected test cases.

---

## English Version

### Trigger

Activated when the user requests an impact analysis (e.g. by running `/qa-impact`), or when analyzing target changes before a deployment.

### Responsibilities

- Analyze the diff, branch differences, or PR changes to locate modified files, modules, or database schemas.
- Map modified areas to Requirements (RFs) and Test IDs using `qa-ai-output/traceability-matrix.md`.
- **Inclusion-Heavy Policy**: Be conservative. If you are uncertain whether a change impacts a requirement, always include it rather than excluding it.
- Never mark an RF unaffected without citing concrete evidence or structural code isolation.
- Write the results to `qa-ai-output/test-impact-analysis.md` using `.qa-ai/templates/test-impact-analysis.template.md`.

### Output Format

The generated report must define:

- `Change Reference`: The git branch name, commit hash, or PR ID.
- `Analysis Date`: Current timestamp.
- `Impacted Areas`: A Markdown table detailing the changed area, affected RFs, affected test IDs (comma-separated), and the reason for inclusion.
- `Selected Test IDs`: A list of all unique test IDs selected for execution (which must equal the union of all IDs in the table, and include all linked tests for the affected RFs).

### Verification

Run validation via:

```bash
node .qa-ai/scripts/validate-test-impact.mjs
```

---

## Versión en Español

### Activación

Se activa cuando el usuario solicita un análisis de impacto (por ejemplo, ejecutando `/qa-impact`), o al analizar cambios antes de un despliegue.

### Responsabilidades

- Analizar el diff, las diferencias de rama o los cambios del PR para ubicar archivos modificados, módulos o esquemas de base de datos.
- Mapear las áreas modificadas a Requisitos (RFs) e IDs de prueba usando `qa-ai-output/traceability-matrix.md`.
- **Política de Inclusión Estricta**: Ser conservador. Si no está seguro de si un cambio afecta a un requisito, inclúyalo siempre en lugar de excluirlo.
- Nunca marque un RF como no afectado sin citar evidencia concreta o aislamiento de código estructural.
- Escribir los resultados en `qa-ai-output/test-impact-analysis.md` usando `.qa-ai/templates/test-impact-analysis.template.md`.

### Formato de Salida

El informe generado debe definir:

- `Change Reference` (Referencia del cambio): El nombre de la rama de git, hash de commit o ID de PR.
- `Analysis Date` (Fecha de análisis): Marca de tiempo actual.
- `Impacted Areas` (Áreas impactadas): Una tabla Markdown que detalla el área cambiada, los RF afectados, los ID de prueba afectados (separados por comas) y el motivo de la inclusión.
- `Selected Test IDs` (ID de pruebas seleccionadas): Una lista de todos los ID de prueba únicos seleccionados para la ejecución (que debe ser igual a la unión de todos los ID en la tabla e incluir todas las pruebas vinculadas para los RF afectados).

### Verificación

Ejecutar la validación a través de:

```bash
node .qa-ai/scripts/validate-test-impact.mjs
```
