# Plan de Implementación: Trazabilidad y Observabilidad

**Versión:** 1.0  
**Fecha:** 2026-01-20  
**Estado:** Propuesta

## Resumen Ejecutivo

Este documento define el plan de implementación para cerrar los gaps identificados en las estrategias de trazabilidad y observabilidad de QA FlowKit. El plan está organizado en tres fases (corto, mediano y largo plazo) con 9 mejoras priorizadas por impacto y esfuerzo.

**Objetivo:** Transformar QA FlowKit de un framework de diseño de tests a un sistema completo de calidad continua con trazabilidad end-to-end y observabilidad shift-right.

---

## Fase 1: Corto Plazo (0-3 meses)

### 1.1 Habilitar Observability por Defecto en Preset Standard

**Impacto:** Alto  
**Esfuerzo:** Bajo  
**Prioridad:** P0

#### Descripción

Activar `observability.enabled: true` en los presets `playwright-full.yaml`, `karate-full.yaml`, y `cypress-full.yaml` para aumentar la adopción de capacidades shift-right.

#### Implementación

**Archivos a modificar:**

- `.qa-ai/presets/playwright-full.yaml`
- `.qa-ai/presets/karate-full.yaml`
- `.qa-ai/presets/cypress-full.yaml`
- `.qa-ai/presets/webdriverio-full.yaml`
- `.qa-ai/presets/appium-full.yaml`

**Cambios:**

```yaml
observability:
  enabled: true
  mode: advisory # advisory en standard, strict en enterprise
  sourcePaths:
    - test-results/**/*.xml
    - test-results/**/*.json
  intakePath: .qa-ai/output/observability-intake.md
  signalAnalysisPath: .qa-ai/output/production-signal-analysis.md
```

**Validación:**

- Ejecutar `node .qa-ai/scripts/validate-config.mjs` en cada preset
- Verificar que `npm run test:e2e-quick` pasa con observability habilitado
- Confirmar que `node .qa-ai/scripts/doctor.mjs` reporta observability como activo

**Criterios de aceptación:**

- [x] Todos los presets standard tienen `observability.enabled: true`
- [x] Los tests E2E pasan sin errores
- [x] La documentación de presets menciona observability

---

### 1.2 Agregar Métricas de Cobertura de Trazabilidad

**Impacto:** Alto  
**Esfuerzo:** Medio  
**Prioridad:** P0

#### Descripción

Generar métricas cuantitativas de cobertura de trazabilidad para reportar a stakeholders:

- % de RFs cubiertos por tests
- % de NFRs con evidencia
- % de tests automatizados vs manuales
- % de tests con trazabilidad completa

#### Implementación

**Nuevo archivo:** `.qa-ai/scripts/traceability-metrics.mjs`

**Lógica:**

```javascript
export async function generateTraceabilityMetrics(cwd, config) {
  const matrix = await loadTraceabilityMatrix(cwd, config);
  const features = await listFeatureFiles(cwd, config);

  const metrics = {
    totalRFs: countUniqueRFs(matrix),
    coveredRFs: countRFsWithFeatures(matrix),
    coveragePercent: calculateCoveragePercent(matrix),

    totalNFRs: countNFRs(matrix),
    nfrsWithEvidence: countNFRsWithEvidence(matrix),
    nfrCoveragePercent: calculateNFRCoverage(matrix),

    totalTests: countTests(matrix),
    automatedTests: countAutomatedTests(matrix),
    manualTests: countManualTests(matrix),
    automationPercent: calculateAutomationPercent(matrix),

    completeTraceability: countCompleteTraceability(matrix),
    partialTraceability: countPartialTraceability(matrix),
    missingTraceability: countMissingTraceability(matrix)
  };

  return metrics;
}
```

**Output:**

- `.qa-ai/output/traceability-metrics.json` (machine-readable)
- `.qa-ai/output/traceability-metrics.md` (human-readable)

**Template del reporte:**

```markdown
# Traceability Metrics Report

## Coverage Summary

| Metric                | Value | Target | Status     |
| --------------------- | ----- | ------ | ---------- |
| RF Coverage           | 85%   | 90%    | ⚠️ Warning |
| NFR Coverage          | 70%   | 80%    | ⚠️ Warning |
| Automation Rate       | 60%   | 70%    | ⚠️ Warning |
| Complete Traceability | 95%   | 100%   | ⚠️ Warning |

## Detailed Breakdown

### Functional Coverage

- Total RFs: 20
- Covered RFs: 17
- Uncovered RFs: 3 (RF-015, RF-022, RF-031)

### NFR Coverage

- Security: 8/10 (80%)
- Performance: 5/8 (62%)
- Accessibility: 3/5 (60%)

### Automation Status

- Automated: 30 tests
- Manual: 20 tests
- Proposal-only: 5 tests
```

**Integración:**

- Agregar comando `npm run qa:traceability-metrics`
- Integrar con `validate-target.mjs` para incluir métricas en el gate
- Agregar a `doctor.mjs` para reportar estado de cobertura

**Criterios de aceptación:**

- [x] Script genera métricas correctas desde matriz de trazabilidad
- [x] Output en JSON y Markdown
- [x] Integrado con `validate-target` y `doctor`
- [x] Tests unitarios cubren casos edge (matriz vacía, RFs sin tests, etc.)

---

### 1.3 Unificar Specialist y Intake Agent de Observability

**Impacto:** Medio  
**Esfuerzo:** Bajo  
**Prioridad:** P1

#### Descripción

Clarificar el rol de observability unificando `observability-testing.md` (specialist) y `production-observability-intake-agent.md` (agent) bajo un concepto coherente: "Observability Engineer".

#### Implementación

**Cambios conceptuales:**

- **Observability Specialist:** Diseña pruebas para validar que el producto sea observable (logs, métricas, traces)
- **Observability Intake Agent:** Analiza señales de producción para detectar gaps de cobertura
- **Unificación:** Ambos son facets del "Observability Engineer" role

**Documentación:**

- Actualizar `.qa-ai/agents/README.md` para explicar la relación
- Agregar diagrama de flujo en `observability-intake.md`
- Crear guía unificada: `.qa-ai/docs/observability-guide.md`

**Diagrama de flujo:**

```
┌─────────────────────────────────────────────────────────┐
│              OBSERVABILITY ENGINEER                      │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │   PRE-RELEASE        │  │   POST-RELEASE       │   │
│  │   (Specialist)       │  │   (Intake Agent)     │   │
│  │                      │  │                      │   │
│  │  - Design log tests  │  │  - Analyze signals   │   │
│  │  - Validate metrics  │  │  - Map to RFs        │   │
│  │  - Check traces      │  │  - Identify gaps     │   │
│  │  - Audit events      │  │  - Propose tests     │   │
│  └──────────────────────┘  └──────────────────────┘   │
│              ↓                            ↓              │
│         observability-test-plan.md    observability-intake.md
└─────────────────────────────────────────────────────────┘
```

**Criterios de aceptación:**

- [x] Documentación clarifica roles y relación
- [x] Guía unificada creada
- [x] Agentes referencian la guía unificada

---

## Fase 2: Mediano Plazo (3-6 meses)

### 2.1 Trazabilidad de Ejecución (Runtime Traceability)

**Impacto:** Alto  
**Esfuerzo:** Alto  
**Prioridad:** P1

#### Descripción

Vincular resultados de ejecución de tests con RFs en runtime, no solo en diseño. Esto permite:

- Saber qué RFs fueron validados en cada ejecución
- Detectar RFs no probados en regression
- Generar reportes de cobertura de ejecución

#### Implementación

**Nuevo archivo:** `.qa-ai/scripts/execution-traceability.mjs`

**Lógica:**

```javascript
export async function linkExecutionToTraceability(cwd, config, executionResults) {
  const matrix = await loadTraceabilityMatrix(cwd, config);
  const results = await parseExecutionResults(executionResults);

  const linkedResults = results.map((result) => {
    const testCase = findTestCaseInMatrix(matrix, result.testId);
    return {
      ...result,
      rfId: testCase?.rfId,
      criterionId: testCase?.criterionId,
      traceabilityComplete: Boolean(testCase?.rfId && testCase?.criterionId)
    };
  });

  return {
    totalTests: linkedResults.length,
    linkedToRF: linkedResults.filter((r) => r.rfId).length,
    unlinkedTests: linkedResults.filter((r) => !r.rfId).length,
    rfCoverage: calculateRFCoverageFromExecution(linkedResults),
    results: linkedResults
  };
}
```

**Output:**

- `.qa-ai/output/execution-traceability.json`
- `.qa-ai/output/execution-traceability.md`

**Integración con execution-agent:**

- Modificar `.qa-ai/agents/execution-agent.md` para llamar a `execution-traceability.mjs`
- Agregar validación de trazabilidad de ejecución en `validate-execution-evidence.mjs`

**Template del reporte:**

```markdown
# Execution Traceability Report

## Summary

| Metric               | Value                                      |
| -------------------- | ------------------------------------------ |
| Total Tests Executed | 50                                         |
| Linked to RF         | 48 (96%)                                   |
| Unlinked Tests       | 2 (4%)                                     |
| RFs Validated        | 30/35 (86%)                                |
| RFs Not Validated    | 5 (RF-015, RF-022, RF-031, RF-042, RF-050) |

## Unlinked Tests

| Test ID | Test Name       | Issue            | Recommendation |
| ------- | --------------- | ---------------- | -------------- |
| TC-099  | Login edge case | Missing @rf: tag | Add @rf:RF-042 |
| TC-100  | API timeout     | Missing @rf: tag | Add @rf:RF-050 |

## RFs Not Validated

| RF ID  | RF Title            | Reason            | Risk     |
| ------ | ------------------- | ----------------- | -------- |
| RF-015 | Checkout flow       | No tests executed | High     |
| RF-022 | Payment integration | Tests skipped     | Critical |
```

**Criterios de aceptación:**

- [x] Script vincula test results con RFs desde matriz
- [x] Reporte identifica tests sin trazabilidad
- [x] Reporte identifica RFs no validados en ejecución
- [x] Integrado con execution-agent y validate-execution-evidence
- [x] Tests unitarios cubren casos edge

---

### 2.2 Change Impact Prediction

**Impacto:** Alto  
**Esfuerzo:** Alto  
**Prioridad:** P1

#### Descripción

Analizar diffs de código para predecir qué RFs pueden estar afectados por los cambios. Esto habilita:

- Shift-left testing (probar antes de merge)
- Test selection inteligente (solo tests afectados)
- Risk-based test prioritization

#### Implementación

**Nuevo archivo:** `.qa-ai/scripts/change-impact.mjs`

**Lógica:**

```javascript
export async function predictChangeImpact(cwd, config, gitDiff) {
  const matrix = await loadTraceabilityMatrix(cwd, config);
  const changedFiles = parseGitDiff(gitDiff);

  // Map changed files to RFs via test files
  const affectedTests = changedFiles.filter((f) => f.type === 'test').map((f) => findRFsForTestFile(matrix, f.path));

  // Map changed files to RFs via code ownership (if configured)
  const codeOwnershipMap = await loadCodeOwnershipMap(cwd, config);
  const affectedRFsFromCode = changedFiles
    .filter((f) => f.type === 'source')
    .map((f) => findRFsForCodeFile(codeOwnershipMap, f.path));

  const allAffectedRFs = deduplicate([...affectedTests, ...affectedRFsFromCode]);

  return {
    changedFiles: changedFiles.length,
    affectedTests: affectedTests.length,
    affectedRFs: allAffectedRFs.length,
    rfDetails: allAffectedRFs.map((rf) => ({
      rfId: rf.rfId,
      rfTitle: rf.title,
      affectedBy: rf.affectedBy, // 'test-change' | 'code-change' | 'both'
      riskLevel: rf.riskLevel,
      recommendedTests: rf.recommendedTests
    }))
  };
}
```

**Output:**

- `.qa-ai/output/change-impact.json`
- `.qa-ai/output/change-impact.md`

**Integración:**

- Nuevo comando: `npm run qa:change-impact -- --branch main`
- Integrar con PR workflow para comentar en PRs
- Agregar a `test-impact-agent.md` como input

**Template del reporte:**

```markdown
# Change Impact Analysis

## Summary

| Metric                   | Value |
| ------------------------ | ----- |
| Files Changed            | 15    |
| Test Files Changed       | 5     |
| Source Files Changed     | 10    |
| Affected RFs             | 8     |
| Recommended Tests to Run | 25    |

## Affected Requirements

| RF ID  | RF Title    | Affected By               | Risk   | Recommended Tests      |
| ------ | ----------- | ------------------------- | ------ | ---------------------- |
| RF-042 | Login flow  | Code change (auth.js)     | High   | TC-003, TC-004, TC-005 |
| RF-050 | API timeout | Test change (api.spec.js) | Medium | TC-010, TC-011         |

## Recommended Test Execution

### High Priority (run first)

- TC-003: Login happy path
- TC-004: Login invalid credentials
- TC-005: Login session timeout

### Medium Priority

- TC-010: API response time
- TC-011: API error handling

## Files Changed

| File                | Type   | Affected RFs |
| ------------------- | ------ | ------------ |
| src/auth/login.js   | source | RF-042       |
| tests/login.spec.js | test   | RF-042       |
| src/api/client.js   | source | RF-050       |
```

**Criterios de aceptación:**

- [x] Script analiza git diff y mapea a RFs
- [x] Soporta code ownership map (opcional)
- [x] Reporte identifica RFs afectados y tests recomendados
- [x] Integrado con PR workflow (comment en PR)
- [x] Tests unitarios cubren casos edge

---

## Fase 3: Largo Plazo (6-12 meses)

### 3.1 Integración con APM Tools

**Impacto:** Medio  
**Esfuerzo:** Alto  
**Prioridad:** P2

#### Descripción

Conectar QA FlowKit con APM tools (Datadog, New Relic, Grafana) para ingestar señales de producción automáticamente. Esto requiere:

- Approval gate para conexiones externas
- Secure credential management
- Rate limiting y retry logic

#### Implementación

**Nuevo archivo:** `.qa-ai/scripts/observability-connectors/datadog.mjs`

**Lógica:**

```javascript
export async function fetchDatadogSignals(cwd, config, credentials) {
  // Validate approval
  const approval = await checkExternalWriteApproval(cwd, 'datadog');
  if (!approval) {
    throw new Error('External write approval required for Datadog integration');
  }

  // Fetch incidents from Datadog API
  const incidents = await datadogAPI.getIncidents({
    apiKey: credentials.apiKey,
    appKey: credentials.appKey,
    since: config.observability.lookbackDays || 7
  });

  // Normalize to standard signal format
  return incidents.map((incident) => ({
    signalId: incident.id,
    source: 'datadog',
    date: incident.created,
    area: incident.service,
    severity: incident.severity,
    description: incident.title,
    raw: incident
  }));
}
```

**Configuración:**

```yaml
observability:
  connectors:
    datadog:
      enabled: false
      credentialsPath: .qa-ai/secrets/datadog.json # Never commit!
      lookbackDays: 7
    newrelic:
      enabled: false
      credentialsPath: .qa-ai/secrets/newrelic.json
      lookbackDays: 7
```

**Seguridad:**

- Credentials en `.qa-ai/secrets/` (gitignored)
- Approval gate obligatorio antes de conexión
- Rate limiting: max 100 requests/hour
- Audit log de todas las conexiones externas

**Criterios de aceptación:**

- [x] Conectores para Datadog y New Relic
- [x] Approval gate obligatorio
- [x] Credentials gestionadas de forma segura
- [x] Rate limiting y retry logic
- [x] Audit log de conexiones
- [x] Tests de integración con mocks

---

### 3.2 Dependency Graph de RFs

**Impacto:** Medio  
**Esfuerzo:** Alto  
**Prioridad:** P2

#### Descripción

Mapear relaciones de dependencia entre RFs para:

- Impact analysis más preciso
- Test selection inteligente
- Risk propagation

#### Implementación

**Nuevo archivo:** `.qa-ai/scripts/rf-dependency-graph.mjs`

**Lógica:**

```javascript
export async function buildRFDependencyGraph(cwd, config) {
  const matrix = await loadTraceabilityMatrix(cwd, config);
  const requirements = await loadNormalizedRequirements(cwd, config);

  // Parse dependency declarations from requirements
  const dependencies = requirements.map((req) => ({
    rfId: req.rfId,
    dependsOn: parseDependencies(req.text), // e.g., "Depends on RF-042"
    blocks: parseBlocks(req.text), // e.g., "Blocks RF-050"
    relatedTo: parseRelatedTo(req.text) // e.g., "Related to RF-031"
  }));

  // Build graph
  const graph = {
    nodes: dependencies.map((d) => ({ id: d.rfId, type: 'rf' })),
    edges: []
  };

  for (const dep of dependencies) {
    for (const dependsOn of dep.dependsOn) {
      graph.edges.push({
        from: dep.rfId,
        to: dependsOn,
        type: 'depends-on'
      });
    }
    // ... similar for blocks, relatedTo
  }

  return graph;
}
```

**Output:**

- `.qa-ai/output/rf-dependency-graph.json` (machine-readable)
- `.qa-ai/output/rf-dependency-graph.md` (human-readable)
- `.qa-ai/output/rf-dependency-graph.dot` (Graphviz format)

**Integración:**

- Usar en `change-impact.mjs` para propagar impacto
- Usar en `test-impact-agent.md` para recomendar tests
- Visualizar con Graphviz o D3.js

**Criterios de aceptación:**

- [x] Script construye grafo de dependencias desde requirements
- [x] Soporta depends-on, blocks, related-to relationships
- [x] Output en JSON, Markdown, y Graphviz DOT
- [x] Integrado con change-impact y test-impact
- [x] Tests unitarios cubren grafos cíclicos y disconnected

---

### 3.3 Continuous Traceability (CI/CD Integration)

**Impacto:** Alto  
**Esfuerzo:** Alto  
**Prioridad:** P2

#### Descripción

Actualizar la matriz de trazabilidad automáticamente desde CI/CD:

- Extraer RFs de commits (conventional commits)
- Vincular PRs a RFs
- Actualizar matriz después de merge

#### Implementación

**Nuevo archivo:** `.github/scripts/update-traceability.mjs`

**Lógica:**

```javascript
export async function updateTraceabilityFromCI(cwd, config, prData) {
  const matrix = await loadTraceabilityMatrix(cwd, config);

  // Extract RF IDs from PR title and commits
  const rfIds = extractRFIdsFromPR(prData);

  // Update matrix with PR metadata
  for (const rfId of rfIds) {
    const row = findRowByRF(matrix, rfId);
    if (row) {
      row.lastValidated = prData.mergedAt;
      row.validatedBy = prData.mergeCommit;
      row.validationType = 'ci-cd';
    }
  }

  // Write updated matrix
  await writeTraceabilityMatrix(cwd, config, matrix);

  // Commit and push if changed
  if (hasChanges(matrix)) {
    await commitAndPush(cwd, 'chore: update traceability matrix from CI');
  }
}
```

**GitHub Action:**

```yaml
name: Update Traceability
on:
  pull_request:
    types: [closed]

jobs:
  update-traceability:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update traceability
        run: node .github/scripts/update-traceability.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Criterios de aceptación:**

- [x] Script extrae RF IDs de PRs y commits
- [x] Actualiza matriz con metadata de CI/CD
- [x] GitHub Action corre automáticamente
- [x] Commits y push automáticos (con approval)
- [x] Tests de integración con GitHub API mocks

---

## Roadmap Visual

```
Q1 2026                    Q2 2026                    Q3 2026                    Q4 2026
├──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┤
│                          │                          │                          │                          │
│  [1.1] Enable Obs by     │  [2.1] Execution         │  [3.1] APM Integration   │                          │
│       Default            │       Traceability       │                          │                          │
│                          │                          │                          │                          │
│  [1.2] Traceability      │  [2.2] Change Impact     │  [3.2] RF Dependency     │                          │
│       Metrics            │       Prediction         │       Graph              │                          │
│                          │                          │                          │                          │
│  [1.3] Unify Obs         │                          │  [3.3] Continuous        │                          │
│       Specialist/Agent   │                          │       Traceability       │                          │
│                          │                          │                          │                          │
└──────────────────────────┴──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## Métricas de Éxito

| Métrica                  | Baseline | Target Q1 | Target Q2 | Target Q3 | Target Q4 |
| ------------------------ | -------- | --------- | --------- | --------- | --------- |
| % RFs cubiertos          | N/A      | 85%       | 90%       | 95%       | 98%       |
| % NFRs con evidencia     | N/A      | 70%       | 80%       | 90%       | 95%       |
| % Tests automatizados    | N/A      | 60%       | 70%       | 80%       | 85%       |
| % Trazabilidad completa  | N/A      | 95%       | 98%       | 100%      | 100%      |
| Observability habilitado | 0%       | 50%       | 80%       | 100%      | 100%      |
| Change impact prediction | No       | No        | Sí        | Sí        | Sí        |
| APM integration          | No       | No        | No        | Sí        | Sí        |

---

## Riesgos y Mitigaciones

| Riesgo                                            | Probabilidad | Impacto | Mitigación                                                 |
| ------------------------------------------------- | ------------ | ------- | ---------------------------------------------------------- |
| Complejidad de integración con APM tools          | Alta         | Medio   | Empezar con Datadog (más popular), usar mocks para testing |
| Performance de change impact en repos grandes     | Media        | Alto    | Cachear dependency graph, incremental updates              |
| Resistencia a habilitar observability por defecto | Media        | Bajo    | Documentar beneficios, hacer opcional en quick track       |
| Falsos positivos en change impact                 | Alta         | Medio   | Requerir validación humana, ajustar heurísticas            |
| Security concerns con APM credentials             | Media        | Alto    | Approval gates obligatorios, secrets en vault, audit log   |

---

## Dependencias

| Mejora                      | Depende de                 | Bloquea                     |
| --------------------------- | -------------------------- | --------------------------- |
| 1.1 Habilitar Obs           | -                          | 3.1 APM Integration         |
| 1.2 Métricas                | -                          | 2.1 Execution Traceability  |
| 1.3 Unificar Obs            | -                          | -                           |
| 2.1 Execution Traceability  | 1.2 Métricas               | 3.3 Continuous Traceability |
| 2.2 Change Impact           | 3.2 Dependency Graph       | -                           |
| 3.1 APM Integration         | 1.1 Habilitar Obs          | -                           |
| 3.2 Dependency Graph        | -                          | 2.2 Change Impact           |
| 3.3 Continuous Traceability | 2.1 Execution Traceability | -                           |

---

## Recursos Necesarios

| Rol                   | Esfuerzo (personas/mes) | Fase      |
| --------------------- | ----------------------- | --------- |
| Senior Developer      | 2                       | Q1        |
| Senior Developer      | 3                       | Q2        |
| Senior Developer + QA | 4                       | Q3        |
| **Total**             | **9 personas/mes**      | **Q1-Q3** |

---

## Conclusión

Este plan transforma QA FlowKit de un framework de diseño de tests a un sistema completo de calidad continua. Las mejoras de corto plazo (Q1) son quick wins con alto impacto. Las de mediano plazo (Q2) habilitan shift-left testing inteligente. Las de largo plazo (Q3) cierran el ciclo con shift-right y automatización end-to-end.

**Próximo paso:** Aprobar el plan y comenzar con 1.1 (Habilitar Observability por Defecto) y 1.2 (Métricas de Trazabilidad).
