import path from 'node:path';
import { normalizeColumn, parseMarkdownTable } from './markdown-table.mjs';
import { NFR_EVIDENCE_TYPES } from './nfr-coverage.mjs';
import {
  normalizeCoverageMode,
  normalizeRf,
  parseSectionTable,
  rfFromText,
  techniqueIsKnown
} from './test-coverage.mjs';

export const CRITERION_STATUSES = ['ready', 'ambiguous', 'out-of-scope', 'pending-decision'];
export const PROPOSAL_ACTIONS = ['create', 'reuse', 'modify', 'pending-decision', 'not-applicable'];
export const EVIDENCE_TYPES = [...NFR_EVIDENCE_TYPES];

const REALIZABLE_ACTIONS = new Set(['create', 'reuse', 'modify']);
const NON_FEATURE_EVIDENCE = new Set(
  EVIDENCE_TYPES.filter((value) => value !== 'feature' && value !== 'residual-risk')
);

function cellValue(values, label) {
  const key = Object.keys(values).find((candidate) => normalizeColumn(candidate) === normalizeColumn(label));
  return key ? values[key] : '';
}

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function normalizeAction(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function normalizeEvidenceType(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function parseCriterionIds(value) {
  return String(value || '')
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTestId(value) {
  return String(value || '')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function addFinding(findings, severity, extra) {
  findings.push({ severity, ...extra });
}

function requiredSeverity(mode) {
  return mode === 'strict' ? 'error' : 'warning';
}

function extractNormalizedCriteriaTables(content) {
  const text = String(content || '');
  const lines = text.replace(/\r/g, '').split('\n');
  const tables = [];
  let inTable = false;
  let tableLines = [];

  const flush = () => {
    if (tableLines.length >= 2) tables.push(tableLines.join('\n'));
    tableLines = [];
    inTable = false;
  };

  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      inTable = true;
      tableLines.push(line);
      continue;
    }
    if (inTable) flush();
  }
  if (inTable) flush();

  const criteria = [];
  for (const tableText of tables) {
    const table = parseMarkdownTable(tableText, { label: 'Normalized criteria' });
    const header = table.header.map(normalizeColumn);
    if (!header.includes('criterion id')) continue;
    for (const row of table.rows) {
      const criterionId = String(cellValue(row.values, 'Criterion ID') || '').trim();
      if (!criterionId) continue;
      criteria.push({
        criterionId,
        rf: normalizeRf(cellValue(row.values, 'RF') || rfFromText(criterionId)),
        status: normalizeStatus(cellValue(row.values, 'Status') || 'ready'),
        type: String(cellValue(row.values, 'Type') || '').trim(),
        traceability: String(cellValue(row.values, 'Traceability') || '').trim(),
        condition: String(cellValue(row.values, 'Condition or partition') || '').trim(),
        outcome: String(cellValue(row.values, 'Expected observable outcome') || '').trim()
      });
    }
  }
  return criteria;
}

export function parseNormalizedCriteria(content) {
  return extractNormalizedCriteriaTables(content);
}

export function parseProposedTestRows(proposalContent) {
  const table = parseSectionTable(proposalContent, 'Proposed tests', ['RF']);
  const header = table.header.map(normalizeColumn);
  const hasCriterionIds = header.includes('criterion ids');
  const hasEvidenceType = header.includes('evidence type');
  const hasAction = header.includes('action');
  const hasTestId = header.includes('test id');
  const rows = [];

  for (const row of table.rows) {
    const testId = normalizeTestId(cellValue(row.values, 'Test ID'));
    rows.push({
      rf: normalizeRf(cellValue(row.values, 'RF') || rfFromText(JSON.stringify(row.values))),
      criterionIds: parseCriterionIds(cellValue(row.values, 'Criterion IDs')),
      testId,
      title: String(cellValue(row.values, 'Title') || '').trim(),
      technique: String(cellValue(row.values, 'Technique') || '').trim(),
      evidenceType: normalizeEvidenceType(cellValue(row.values, 'Evidence type')),
      artifactPath: String(cellValue(row.values, 'Artifact path') || '')
        .trim()
        .replaceAll('\\', '/'),
      action: normalizeAction(cellValue(row.values, 'Action')),
      line: row.line
    });
  }

  return {
    ...table,
    rows,
    contract: {
      hasCriterionIds,
      hasEvidenceType,
      hasAction,
      hasTestId
    }
  };
}

export function validateProposalContract({ proposalContent = '', normalizedContent = '', mode = 'advisory' } = {}) {
  const findings = [];
  const severity = requiredSeverity(mode);
  const proposal = parseProposedTestRows(proposalContent);
  const criteria = parseNormalizedCriteria(normalizedContent);

  for (const error of proposal.errors) {
    addFinding(findings, severity, { rf: '', rule: 'proposal-structure', message: error });
  }

  if (criteria.length === 0) {
    return { ok: findings.filter((item) => item.severity === 'error').length === 0, findings, proposal, criteria };
  }

  const { contract } = proposal;
  if (!contract.hasCriterionIds || !contract.hasEvidenceType || !contract.hasAction) {
    const message =
      'Proposed tests table must include Criterion IDs, Evidence type and Action columns for semantic coverage.';
    addFinding(findings, severity, { rf: '', rule: 'proposal-contract-missing', message });
    if (mode !== 'strict') {
      return { ok: true, findings, proposal, criteria: [] };
    }
  }

  for (const row of proposal.rows) {
    const techniques = String(row.technique || '')
      .split(/[+,]/)
      .map((value) => value.trim())
      .filter(Boolean);
    for (const technique of techniques) {
      if (EVIDENCE_TYPES.includes(normalizeEvidenceType(technique))) {
        addFinding(findings, severity, {
          rf: row.rf,
          rule: 'invalid-technique',
          message: `Test ${row.testId || `(line ${row.line})`} uses evidence type "${technique}" as Technique. Use Evidence type instead.`
        });
      } else if (!techniqueIsKnown(technique)) {
        addFinding(findings, severity, {
          rf: row.rf,
          rule: 'invalid-technique',
          message: `Test ${row.testId || `(line ${row.line})`} uses unknown technique "${technique}".`
        });
      }
    }

    if (row.evidenceType && !EVIDENCE_TYPES.includes(row.evidenceType)) {
      addFinding(findings, severity, {
        rf: row.rf,
        rule: 'invalid-evidence-type',
        message: `Test ${row.testId} has unsupported Evidence type "${row.evidenceType}".`
      });
    }

    if (row.action && !PROPOSAL_ACTIONS.includes(row.action)) {
      addFinding(findings, severity, {
        rf: row.rf,
        rule: 'invalid-action',
        message: `Test ${row.testId} has unsupported Action "${row.action}".`
      });
    }

    if (row.action === 'create' && row.evidenceType === 'feature' && !row.testId) {
      addFinding(findings, severity, {
        rf: row.rf,
        rule: 'missing-test-id',
        message: `Proposed feature row at line ${row.line} is missing Test ID.`
      });
    }
  }

  const errors = findings.filter((item) => item.severity === 'error');
  return { ok: errors.length === 0, findings, proposal, criteria: [] };
}

function featureIndex(features) {
  const byId = new Map();
  const byPath = new Map();
  for (const feature of features) {
    const relative = String(feature.file || '').replaceAll('\\', '/');
    const basename = path.basename(relative).toLowerCase();
    byPath.set(relative.toLowerCase(), feature);
    for (const id of feature.ids || []) {
      byId.set(normalizeTestId(id), feature);
    }
    if (feature.testId) byId.set(normalizeTestId(feature.testId), feature);
    byId.set(normalizeTestId(basename.replace(/\.feature$/i, '')), feature);
  }
  return { byId, byPath };
}

function expectedFeaturePath(row, featureRoot = 'features') {
  if (row.artifactPath) return row.artifactPath.replaceAll('\\', '/');
  if (!row.testId) return '';
  const rf = row.rf || 'RF-000';
  return `${featureRoot}/functional/${rf}-${row.testId}.feature`.replaceAll('\\', '/');
}

export function validateSemanticCoverage({
  normalizedContent = '',
  proposalContent = '',
  features = [],
  featureRoot = 'features',
  mode = 'off',
  policy = {},
  options = {}
} = {}) {
  const normalizedMode = normalizeCoverageMode(mode);
  if (normalizedMode === 'off' && !policy.requireCriterionCoverage) {
    return { ok: true, mode: normalizedMode, findings: [], errors: [], warnings: [], skipped: true };
  }

  const criteria = parseNormalizedCriteria(normalizedContent);
  if (criteria.length === 0) {
    return { ok: true, mode: normalizedMode, findings: [], errors: [], warnings: [], skipped: true };
  }

  const severity = requiredSeverity(normalizedMode);
  const findings = [];
  const contract = validateProposalContract({
    proposalContent,
    normalizedContent,
    mode: normalizedMode
  });
  findings.push(...contract.findings);

  const proposal = parseProposedTestRows(proposalContent);
  const { byId, byPath } = featureIndex(features);
  const criteriaById = new Map(criteria.map((item) => [item.criterionId, item]));
  const assignments = new Map(criteria.map((criterion) => [criterion.criterionId, []]));

  for (const row of proposal.rows) {
    for (const criterionId of row.criterionIds) {
      if (!assignments.has(criterionId)) {
        addFinding(findings, severity, {
          rf: row.rf,
          rule: 'unknown-criterion-id',
          message: `Test ${row.testId} references unknown Criterion ID ${criterionId}.`
        });
        continue;
      }
      assignments.get(criterionId).push(row);
    }

    const criterionStatuses = row.criterionIds
      .map((id) => criteriaById.get(id)?.status)
      .filter(Boolean);
    if (criterionStatuses.includes('pending-decision') && row.action === 'create') {
      addFinding(findings, severity, {
        rf: row.rf,
        rule: 'pending-decision-create',
        message: `Test ${row.testId} cannot use Action create while Criterion ID ${row.criterionIds.join(', ')} is pending-decision.`
      });
    }

    if (row.action === 'create' && row.evidenceType === 'feature') {
      const expectedPath = expectedFeaturePath(row, featureRoot);
      const feature =
        byId.get(row.testId) ||
        (expectedPath ? byPath.get(expectedPath.toLowerCase()) : undefined) ||
        features.find((item) =>
          String(item.file || '')
            .toLowerCase()
            .includes(row.testId.toLowerCase())
        );

      if (!feature) {
        addFinding(findings, severity, {
          rf: row.rf,
          rule: 'missing-feature',
          message: `TC ${row.testId} planned with Action create but feature file is missing (expected ${expectedPath || `a .feature with @id:${row.testId}`}).`
        });
      } else if (feature.rf && row.rf && feature.rf !== row.rf) {
        addFinding(findings, severity, {
          rf: row.rf,
          rule: 'rf-mismatch',
          message: `TC ${row.testId} feature ${feature.file} has @rf:${feature.rf} but proposal expects ${row.rf}.`
        });
      }
    }

    if (row.action === 'reuse' || row.action === 'modify') {
      const target = row.artifactPath || expectedFeaturePath(row, featureRoot);
      if (target && !byPath.has(target.toLowerCase()) && !options.allowMissingArtifacts) {
        addFinding(findings, severity, {
          rf: row.rf,
          rule: 'missing-reuse-target',
          message: `Test ${row.testId} Action ${row.action} references missing artifact ${target}.`
        });
      }
    }
  }

  for (const criterion of criteria) {
    if (criterion.status === 'out-of-scope') continue;
    const linked = assignments.get(criterion.criterionId) || [];
    const hasRealizable = linked.some(
      (row) =>
        REALIZABLE_ACTIONS.has(row.action) &&
        (row.evidenceType === 'feature' || NON_FEATURE_EVIDENCE.has(row.evidenceType))
    );

    if (criterion.status === 'ready' && !hasRealizable) {
      addFinding(findings, severity, {
        rf: criterion.rf,
        rule: 'criterion-without-test',
        message: `Criterion ${criterion.criterionId} is ready but has no linked test with create, reuse, modify or non-feature evidence.`
      });
    }

    if (criterion.status === 'pending-decision') {
      const hasCreate = linked.some((row) => row.action === 'create');
      if (hasCreate) {
        addFinding(findings, severity, {
          rf: criterion.rf,
          rule: 'pending-decision-covered',
          message: `Criterion ${criterion.criterionId} is pending-decision but has Action create in the proposal.`
        });
      }
    }
  }

  const errors = findings.filter((item) => item.severity === 'error');
  const warnings = findings.filter((item) => item.severity === 'warning');
  return {
    ok: errors.length === 0,
    mode: normalizedMode,
    findings,
    errors,
    warnings,
    criteria,
    metrics: {
      totalCriteria: criteria.length,
      readyCriteria: criteria.filter((item) => item.status === 'ready').length,
      pendingDecision: criteria.filter((item) => item.status === 'pending-decision').length
    }
  };
}

export function mergeSemanticCoverageResults(base, semantic) {
  if (!semantic || semantic.skipped) return base;
  const findings = [...(base.findings || []), ...(semantic.findings || [])];
  const errors = findings.filter((item) => item.severity === 'error');
  const warnings = findings.filter((item) => item.severity === 'warning');
  return {
    ...base,
    ok: Boolean(base.ok) && semantic.ok,
    findings,
    errors,
    warnings,
    semantic,
    semanticMetrics: semantic.metrics
  };
}
