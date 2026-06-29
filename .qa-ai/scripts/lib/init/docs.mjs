import { ARTIFACT_PATHS, getConfigValue } from '../utils.mjs';

const spanishTemplateHeadings = new Map([
  ['# Requirement Analysis', '# Analisis de requisitos'],
  ['# Source Analysis', '# Analisis de fuentes'],
  ['## Inputs', '## Entradas'],
  ['## Facts by source', '## Hechos por fuente'],
  ['## Cross-source agreements', '## Acuerdos entre fuentes'],
  ['## Contradictions', '## Contradicciones'],
  ['## Unsupported design observations', '## Observaciones de diseno no respaldadas'],
  ['## Extraction limitations', '## Limitaciones de extraccion'],
  ['## Pending decisions', '## Decisiones pendientes'],
  ['## Main source', '## Fuente principal'],
  ['## Complementary sources', '## Fuentes complementarias'],
  ['## Functional scope', '## Alcance funcional'],
  ['## Acceptance Criteria', '## Criterios de aceptacion'],
  ['## Inferred Acceptance Criteria', '## Criterios de aceptacion inferidos'],
  ['## Ambiguities requiring user decision', '## Ambiguedades que requieren decision del usuario'],
  ['## Ambiguities', '## Ambiguedades'],
  ['## Out of scope', '## Fuera de alcance'],
  ['## QA impact', '## Impacto en QA'],
  ['# Test Management Coverage Analysis', '# Analisis de cobertura de gestion de pruebas'],
  ['# System Test Design', '# Diseno de pruebas de sistema'],
  ['## Architecture alignment', '## Alineacion con arquitectura'],
  ['## Testability risks', '## Riesgos de testabilidad'],
  ['## Cross-RF coverage strategy', '## Estrategia de cobertura entre RFs'],
  ['## Shared fixtures and data', '## Fixtures y datos compartidos'],
  ['## Non-functional focus', '## Enfoque no funcional'],
  ['## Open questions', '## Preguntas abiertas'],
  ['# Test Design Proposal (per RF / epic)', '# Propuesta de diseno de pruebas (por RF / epic)'],
  ['## Official RF ID', '## RF oficial'],
  ['## Scope', '## Alcance'],
  ['## Proposed tests', '## Pruebas propuestas'],
  ['## Coverage obligations', '## Obligaciones de cobertura'],
  ['## Security review', '## Revision de seguridad'],
  ['## Residual coverage gaps', '## Brechas de cobertura residual'],
  ['## Existing tests to reuse', '## Pruebas existentes para reutilizar'],
  ['## Existing tests requiring modification', '## Pruebas existentes que requieren modificacion'],
  ['## New tests to create', '## Nuevas pruebas a crear'],
  ['## Approval request', '## Solicitud de aprobacion'],
  ['# Automation Feasibility Report', '# Informe de viabilidad de automatizacion'],
  ['# Automation Implementation Plan', '# Plan de implementacion de automatizacion'],
  ['# Traceability Matrix', '# Matriz de trazabilidad'],
  ['# Test Management Sync Plan', '# Plan de sincronizacion de gestion de pruebas'],
  ['# Jira Automation Task Draft', '# Borrador de tarea de automatizacion'],
  ['# PR Summary', '# Resumen de PR'],
  ['## Summary', '## Resumen'],
  ['## Validation', '## Validacion'],
  ['## Risks', '## Riesgos'],
  ['## Residual risk', '## Riesgo residual']
]);

export function generatedDocs(config) {
  const docs = [
    ['templates/requirement-analysis.template.md', ARTIFACT_PATHS.requirementAnalysis],
    ['templates/source-analysis.template.md', ARTIFACT_PATHS.sourceAnalysis],
    ['templates/test-management-coverage-analysis.template.md', ARTIFACT_PATHS.testManagementCoverage],
    ['templates/test-design-system.template.md', ARTIFACT_PATHS.testDesignSystem],
    ['templates/test-design-proposal.template.md', ARTIFACT_PATHS.testDesignProposal],
    ['templates/automation-feasibility-report.template.md', ARTIFACT_PATHS.automationFeasibility],
    ['templates/automation-implementation-plan.template.md', ARTIFACT_PATHS.automationImplementation],
    ['templates/traceability-matrix.template.md', ARTIFACT_PATHS.traceabilityMatrix],
    ['templates/test-management-sync-plan.template.md', ARTIFACT_PATHS.testManagementSyncPlan],
    ['templates/jira-automation-task.template.md', ARTIFACT_PATHS.jiraAutomationTask],
    ['templates/pr-template.md', ARTIFACT_PATHS.prSummary],
    ['templates/release-gate.template.yaml', ARTIFACT_PATHS.releaseGate],
    ['templates/qa-custom/validate-naming.example.mjs', 'qa-custom/validate-naming.example.mjs']
  ];

  if (getConfigValue(config, 'testManagementSync.mode', 'proposal-only') === 'governed') {
    const diffPath = getConfigValue(config, 'testManagementSync.diffPath', ARTIFACT_PATHS.testManagementSyncDiff);
    const snapshotPath = getConfigValue(
      config,
      'testManagementSync.remoteSnapshotPath',
      ARTIFACT_PATHS.testManagementRemoteSnapshot
    );
    const rollbackPath = getConfigValue(
      config,
      'testManagementSync.rollbackPath',
      ARTIFACT_PATHS.testManagementRollback
    );
    const applyLogPath = getConfigValue(
      config,
      'testManagementSync.applyLogPath',
      ARTIFACT_PATHS.testManagementApplyLog
    );
    docs.push(
      ['templates/test-management-sync-diff.template.md', diffPath],
      ['templates/test-management-remote-snapshot.template.md', snapshotPath],
      ['templates/test-management-rollback-plan.template.md', rollbackPath],
      ['templates/test-management-apply-log.template.md', applyLogPath]
    );
  }

  if (getConfigValue(config, 'sources.external.enabled', false)) {
    const reqImportPath = getConfigValue(
      config,
      'sources.external.requirementsImportPath',
      ARTIFACT_PATHS.importedRequirements
    );
    const casesImportPath = getConfigValue(config, 'sources.external.casesImportPath', ARTIFACT_PATHS.importedCases);
    docs.push(
      ['templates/imported-requirements.template.md', reqImportPath],
      ['templates/imported-cases.template.md', casesImportPath]
    );
  }

  return docs;
}

export function localizeTemplate(content, language) {
  if (String(language || '').toLowerCase() !== 'es') return content;
  let updated = content;
  for (const [english, spanish] of spanishTemplateHeadings) {
    updated = updated.replaceAll(english, spanish);
  }
  return updated.replaceAll(
    'Do you approve generating the proposed `.feature` files?',
    'Apruebas generar los archivos `.feature` propuestos?'
  );
}
