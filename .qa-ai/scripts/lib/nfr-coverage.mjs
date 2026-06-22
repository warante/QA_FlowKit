import { normalizeCoverageMode, COVERAGE_MODES, parseSectionTable } from './test-coverage.mjs';
import path from 'node:path';

const TRUE_VALUES = new Set(['true', 'yes', 'y', 'required', 'applicable', 'si', 'sí']);
const FALSE_VALUES = new Set(['false', 'no', 'n', 'not-applicable', 'not applicable', 'n/a', 'na']);
const NOT_CONFIGURED_PHRASES = ['not configured', 'not configured for coverage'];

/** Quality attributes recognized for source non-functional requirements. */
export const NFR_ATTRIBUTES = [
  'security',
  'performance',
  'availability',
  'reliability',
  'scalability',
  'usability',
  'accessibility',
  'portability',
  'compatibility',
  'maintainability'
];

/** Evidence types admissible for NFR coverage decisions. */
export const NFR_EVIDENCE_TYPES = [
  'feature',
  'automation-script',
  'manual-charter',
  'test-plan',
  'technical-review',
  'residual-risk'
];

/** Status values for NFR coverage rows in proposals and traceability. */
export const NFR_COVERAGE_STATUSES = ['planned', 'covered', 'blocked', 'not-applicable', 'residual-risk'];

/** Configuration modes for source NFR validation policy. */
export const NFR_POLICY_MODES = ['inherit', 'advisory', 'strict', 'off'];

export const NFR_SECTION_HEADINGS = {
  normalized: 'Non-functional requirements',
  proposal: 'Non-functional coverage',
  traceability: 'Non-functional traceability'
};

const NFR_SECTION_ALIASES = {
  'non-functional requirements': ['requisitos no funcionales'],
  'non-functional coverage': ['cobertura no funcional'],
  'non-functional traceability': ['trazabilidad no funcional']
};

/** Attributes that require threshold/oracle when applicable. */
export const NFR_THRESHOLD_ATTRIBUTES = new Set(['performance', 'availability', 'reliability', 'scalability']);

/** Attributes that require environment/precondition when applicable. */
export const NFR_ENVIRONMENT_ATTRIBUTES = new Set([
  'security',
  'performance',
  'availability',
  'reliability',
  'scalability',
  'accessibility',
  'portability',
  'compatibility'
]);

export function normalizeNfrPolicyMode(value, fallback = 'inherit') {
  const mode = String(value || fallback)
    .trim()
    .toLowerCase();
  return NFR_POLICY_MODES.includes(mode) ? mode : fallback;
}

export function normalizeNfrAttribute(value) {
  const attribute = String(value || '')
    .trim()
    .toLowerCase();
  return NFR_ATTRIBUTES.includes(attribute) ? attribute : '';
}

export function normalizeNfrEvidenceType(value) {
  const evidenceType = String(value || '')
    .trim()
    .toLowerCase();
  return NFR_EVIDENCE_TYPES.includes(evidenceType) ? evidenceType : '';
}

export function normalizeNfrCoverageStatus(value) {
  const status = String(value || '')
    .trim()
    .toLowerCase();
  return NFR_COVERAGE_STATUSES.includes(status) ? status : '';
}

export function nfrSectionAliases(heading) {
  const normalized = String(heading || '')
    .trim()
    .toLowerCase()
    .replace(/^#+\s*/, '');
  return NFR_SECTION_ALIASES[normalized] || [];
}

/**
 * Resolve effective source-NFR validation severity.
 *
 * Closed product decision: preventive `testDesign.coverage.mode: off` still yields
 * advisory warnings for explicit source NFRs unless `nonFunctionalCoverage.mode` is `off`.
 */
export function resolveSourceNfrCoverageMode(config = {}) {
  const coverage = config.testDesign?.coverage || {};
  const nfrPolicy = config.testDesign?.nonFunctionalCoverage || {};
  const configured = normalizeNfrPolicyMode(nfrPolicy.mode, 'inherit');

  if (configured === 'off') return 'off';
  if (configured === 'inherit') {
    const inherited = normalizeCoverageMode(coverage.mode, 'off');
    if (inherited === 'off') return 'advisory';
    return inherited;
  }
  return configured;
}

export function resolveNonFunctionalCoveragePolicy(config = {}) {
  const nfrPolicy = config.testDesign?.nonFunctionalCoverage || {};
  return {
    mode: resolveSourceNfrCoverageMode(config),
    requireDecisionForSourceNfr: nfrPolicy.requireDecisionForSourceNfr !== false,
    allowResidualRiskInAdvisory: nfrPolicy.allowResidualRiskInAdvisory !== false
  };
}

export function isKnownNfrContractValue(kind, value) {
  switch (kind) {
    case 'attribute':
      return Boolean(normalizeNfrAttribute(value));
    case 'evidence':
      return Boolean(normalizeNfrEvidenceType(value));
    case 'status':
      return Boolean(normalizeNfrCoverageStatus(value));
    case 'policy-mode':
      return NFR_POLICY_MODES.includes(
        String(value || '')
          .trim()
          .toLowerCase()
      );
    case 'coverage-mode':
      return COVERAGE_MODES.includes(normalizeCoverageMode(value, ''));
    default:
      return false;
  }
}

function normalizeRf(value) {
  return String(value || '')
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function booleanValue(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

function requiredSeverity(mode) {
  return mode === 'strict' ? 'error' : 'warning';
}

function addFinding(findings, severity, rf, rule, message) {
  if (!severity) return;
  findings.push({ severity, rf, rule, message });
}

function cellValue(values, ...keys) {
  for (const key of keys) {
    const value = values[normalizeColumnKey(key)];
    if (value !== undefined && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function normalizeColumnKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function mentionsNotConfigured(...parts) {
  const text = parts.join(' ').trim().toLowerCase();
  return NOT_CONFIGURED_PHRASES.some((phrase) => text.includes(phrase));
}

export function parseNormalizedSourceNfrs(content) {
  return parseSectionTable(content, NFR_SECTION_HEADINGS.normalized, ['NFR ID', 'Attribute']);
}

export function parseProposalNfrCoverage(content) {
  return parseSectionTable(content, NFR_SECTION_HEADINGS.proposal, [
    'NFR ID',
    'Attribute',
    'Applicable',
    'Evidence type',
    'Status'
  ]);
}

export function parseNfrTraceabilityTable(content) {
  return parseSectionTable(content, NFR_SECTION_HEADINGS.traceability, [
    'NFR ID',
    'Attribute',
    'Evidence type',
    'Status'
  ]);
}

export function summarizeNfrCoverageMetrics(rows = []) {
  const metrics = {
    total: 0,
    covered: 0,
    planned: 0,
    blocked: 0,
    residualRisk: 0,
    notApplicable: 0
  };

  for (const row of rows) {
    metrics.total += 1;
    const status = normalizeNfrCoverageStatus(cellValue(row.values, 'Status'));
    switch (status) {
      case 'covered':
        metrics.covered += 1;
        break;
      case 'planned':
        metrics.planned += 1;
        break;
      case 'blocked':
        metrics.blocked += 1;
        break;
      case 'residual-risk':
        metrics.residualRisk += 1;
        break;
      case 'not-applicable':
        metrics.notApplicable += 1;
        break;
      default:
        break;
    }
  }

  return metrics;
}

/**
 * Validate the non-functional traceability table against normalized source NFRs.
 */
export function validateNfrTraceability({ normalizedContent = '', matrixContent = '' }) {
  const errors = [];
  const warnings = [];
  const sourceTable = parseNormalizedSourceNfrs(normalizedContent);
  const traceTable = parseNfrTraceabilityTable(matrixContent);

  errors.push(...sourceTable.errors, ...traceTable.errors);

  if (sourceTable.rows.length === 0) {
    return { ok: errors.length === 0, errors, warnings, metrics: summarizeNfrCoverageMetrics() };
  }

  if (!traceTable.exists) {
    errors.push(
      'Traceability matrix is missing ## Non-functional traceability while normalized requirements list source NFRs.'
    );
    return { ok: false, errors, warnings, metrics: summarizeNfrCoverageMetrics() };
  }

  const byNfrId = new Map();
  const byRfNfr = new Set();

  for (const row of traceTable.rows) {
    const nfrId = cellValue(row.values, 'NFR ID');
    const rf = normalizeRf(cellValue(row.values, 'RF'));
    const attribute = normalizeNfrAttribute(cellValue(row.values, 'Attribute'));
    const evidenceType = normalizeNfrEvidenceType(cellValue(row.values, 'Evidence type'));
    const evidenceReference = cellValue(row.values, 'Evidence reference');
    const status = normalizeNfrCoverageStatus(cellValue(row.values, 'Status'));

    if (!nfrId) {
      errors.push(`Line ${row.line}: NFR traceability row must include NFR ID.`);
      continue;
    }
    if (!rf) {
      errors.push(`Line ${row.line}: NFR traceability row for ${nfrId} must include RF.`);
    }
    if (!attribute) {
      errors.push(`Line ${row.line}: NFR traceability row for ${nfrId} must include a known Attribute.`);
    }
    if (byNfrId.has(nfrId)) {
      errors.push(`NFR ID ${nfrId} appears more than once in ## Non-functional traceability.`);
    }
    byNfrId.set(nfrId, row);

    const rfNfrKey = `${rf}::${nfrId}`;
    if (byRfNfr.has(rfNfrKey)) {
      errors.push(`Combination ${rf} + ${nfrId} is duplicated in ## Non-functional traceability.`);
    }
    byRfNfr.add(rfNfrKey);

    if (!evidenceType && status !== 'not-applicable') {
      warnings.push(`${nfrId} traceability row is missing Evidence type.`);
    } else if (evidenceType && !NFR_EVIDENCE_TYPES.includes(evidenceType)) {
      errors.push(`${nfrId} uses unknown evidence type "${evidenceType}" in traceability.`);
    }

    if (!evidenceReference && ['covered', 'planned'].includes(status)) {
      warnings.push(`${nfrId} traceability row with status "${status}" should include Evidence reference.`);
    }
  }

  for (const row of sourceTable.rows) {
    const nfrId = cellValue(row.values, 'NFR ID');
    const rf = normalizeRf(cellValue(row.values, 'RF'));
    const attribute = normalizeNfrAttribute(cellValue(row.values, 'Attribute'));
    const traceRow = byNfrId.get(nfrId);

    if (!traceRow) {
      errors.push(`Source NFR ${nfrId} (${attribute}) is missing from ## Non-functional traceability.`);
      continue;
    }

    const traceRf = normalizeRf(cellValue(traceRow.values, 'RF'));
    const traceAttribute = normalizeNfrAttribute(cellValue(traceRow.values, 'Attribute'));
    if (traceRf !== rf) {
      errors.push(`${nfrId} traceability RF (${traceRf}) does not match normalized RF (${rf}).`);
    }
    if (traceAttribute !== attribute) {
      errors.push(
        `${nfrId} traceability attribute (${traceAttribute || 'missing'}) does not match normalized attribute (${attribute}).`
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: summarizeNfrCoverageMetrics(traceTable.rows)
  };
}

function obligationSilencesAttribute(obligations, attribute) {
  const obligation = obligations.get(attribute);
  if (!obligation) return false;
  if (obligation.applicable !== false) return false;
  return mentionsNotConfigured(obligation.rationale, obligation.evidence);
}

function parseLegacyObligations(proposalContent) {
  const table = parseSectionTable(proposalContent, 'Coverage obligations', ['Obligation']);
  const byRf = new Map();
  if (!table.exists) return { errors: table.errors, byRf };
  for (const row of table.rows) {
    const rf = normalizeRf(cellValue(row.values, 'RF'));
    const obligationName = cellValue(row.values, 'Obligation')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/-tests$/, '')
      .replace(/^positive-tests$/, 'positive');
    if (!rf || !obligationName) continue;
    if (!byRf.has(rf)) byRf.set(rf, new Map());
    byRf.get(rf).set(obligationName, {
      applicable: booleanValue(cellValue(row.values, 'Applicable')),
      rationale: cellValue(row.values, 'Rationale'),
      evidence: cellValue(row.values, 'Evidence')
    });
  }
  return { errors: table.errors, byRf };
}

function featureExists(features, reference) {
  const normalizedRef = String(reference || '')
    .trim()
    .replace(/\\/g, '/');
  if (!normalizedRef) return false;
  return features.some((feature) => {
    const featurePath = String(feature.file || '').replace(/\\/g, '/');
    return (
      featurePath === normalizedRef ||
      featurePath.endsWith(`/${normalizedRef}`) ||
      path.basename(featurePath) === path.basename(normalizedRef)
    );
  });
}

/**
 * Validate explicit source NFRs from normalized requirements against proposal coverage rows.
 */
export function validateSourceNfrCoverage({
  normalizedContent = '',
  proposalContent = '',
  features = [],
  mode = 'off',
  policy = {}
}) {
  const normalizedMode = normalizeCoverageMode(mode, 'off');
  if (normalizedMode === 'off' || policy.requireDecisionForSourceNfr === false) {
    return { ok: true, mode: normalizedMode, findings: [], errors: [], warnings: [] };
  }

  const severity = requiredSeverity(normalizedMode);
  const findings = [];
  const sourceTable = parseNormalizedSourceNfrs(normalizedContent);
  const coverageTable = parseProposalNfrCoverage(proposalContent);
  const legacyObligations = parseLegacyObligations(proposalContent);

  for (const error of [...sourceTable.errors, ...coverageTable.errors, ...legacyObligations.errors]) {
    addFinding(findings, severity, '', 'nfr-structure', error);
  }

  if (sourceTable.rows.length === 0) {
    const errors = findings.filter((finding) => finding.severity === 'error');
    const warnings = findings.filter((finding) => finding.severity === 'warning');
    return { ok: errors.length === 0, mode: normalizedMode, findings, errors, warnings };
  }

  if (!coverageTable.exists) {
    addFinding(
      findings,
      severity,
      '',
      'nfr-coverage-missing',
      'Proposal is missing ## Non-functional coverage while normalized requirements list source NFRs.'
    );
  }

  const coverageById = new Map();
  for (const row of coverageTable.rows) {
    const nfrId = cellValue(row.values, 'NFR ID');
    if (!nfrId) continue;
    if (coverageById.has(nfrId)) {
      addFinding(
        findings,
        severity,
        '',
        'nfr-duplicate-id',
        `Duplicate NFR ID "${nfrId}" in ## Non-functional coverage.`
      );
      continue;
    }
    coverageById.set(nfrId, row);
  }

  for (const row of sourceTable.rows) {
    const nfrId = cellValue(row.values, 'NFR ID');
    const rf = normalizeRf(cellValue(row.values, 'RF'));
    const attribute = normalizeNfrAttribute(cellValue(row.values, 'Attribute'));
    const coverageRow = coverageById.get(nfrId);
    const rfObligations = legacyObligations.byRf.get(rf) || new Map();

    if (!nfrId || !rf || !attribute) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-source-invalid',
        'Normalized NFR row must include NFR ID, RF and Attribute.'
      );
      continue;
    }

    if (obligationSilencesAttribute(rfObligations, attribute)) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-legacy-silenced',
        `${rf} marks ${attribute} as not configured in Coverage obligations while source NFR ${nfrId} requires an explicit decision.`
      );
    }

    if (!coverageRow) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-missing-row',
        `Source NFR ${nfrId} (${attribute}) requires a matching row in ## Non-functional coverage.`
      );
      continue;
    }

    const coverageRf = normalizeRf(cellValue(coverageRow.values, 'RF'));
    const coverageAttribute = normalizeNfrAttribute(cellValue(coverageRow.values, 'Attribute'));
    if (coverageRf !== rf) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-rf-mismatch',
        `${nfrId} coverage row RF (${coverageRf}) does not match normalized RF (${rf}).`
      );
    }
    if (coverageAttribute !== attribute) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-attribute-mismatch',
        `${nfrId} coverage attribute (${coverageAttribute || 'missing'}) does not match normalized attribute (${attribute}).`
      );
    }

    const applicable = booleanValue(cellValue(coverageRow.values, 'Applicable'));
    const rationale = cellValue(coverageRow.values, 'Rationale');
    const evidenceType = normalizeNfrEvidenceType(cellValue(coverageRow.values, 'Evidence type'));
    const evidenceReference = cellValue(coverageRow.values, 'Evidence reference');
    const threshold = cellValue(coverageRow.values, 'Threshold / oracle', 'Threshold', 'Oracle');
    const environment = cellValue(coverageRow.values, 'Environment or precondition', 'Environment');
    const status = normalizeNfrCoverageStatus(cellValue(coverageRow.values, 'Status'));

    if (applicable === null) {
      addFinding(findings, severity, rf, 'nfr-applicable-missing', `${nfrId} must declare whether it is applicable.`);
      continue;
    }

    if (applicable === false) {
      if (!rationale || mentionsNotConfigured(rationale)) {
        addFinding(
          findings,
          severity,
          rf,
          'nfr-exclusion-unjustified',
          `${nfrId} is not applicable but lacks a requirement-specific rationale.`
        );
      }
      continue;
    }

    if (!evidenceType) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-evidence-type-missing',
        `${nfrId} is applicable but has no evidence type.`
      );
    } else if (!NFR_EVIDENCE_TYPES.includes(evidenceType)) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-evidence-type-unknown',
        `${nfrId} uses unknown evidence type "${evidenceType}".`
      );
    }

    if (!evidenceReference) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-evidence-reference-missing',
        `${nfrId} is applicable but has no evidence reference.`
      );
    }

    if (NFR_THRESHOLD_ATTRIBUTES.has(attribute) && !threshold) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-threshold-missing',
        `${nfrId} (${attribute}) requires Threshold / oracle when applicable.`
      );
    }

    if (NFR_ENVIRONMENT_ATTRIBUTES.has(attribute) && !environment) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-environment-missing',
        `${nfrId} (${attribute}) requires Environment or precondition when applicable.`
      );
    }

    if (
      evidenceType === 'feature' &&
      evidenceReference &&
      features.length > 0 &&
      !featureExists(features, evidenceReference)
    ) {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-feature-missing',
        `${nfrId} references missing feature evidence "${evidenceReference}".`
      );
    }

    if (evidenceType === 'residual-risk') {
      if (!rationale) {
        addFinding(
          findings,
          severity,
          rf,
          'nfr-residual-risk-incomplete',
          `${nfrId} residual-risk requires rationale with next action and closure condition.`
        );
      }
      if (normalizedMode === 'strict') {
        addFinding(
          findings,
          severity,
          rf,
          'nfr-residual-risk-not-covered',
          `${nfrId} residual-risk does not count as satisfied coverage in strict mode.`
        );
      } else if (!policy.allowResidualRiskInAdvisory) {
        addFinding(
          findings,
          severity,
          rf,
          'nfr-residual-risk-blocked',
          `${nfrId} residual-risk is not allowed by nonFunctionalCoverage.allowResidualRiskInAdvisory.`
        );
      }
    }

    if (status === 'residual-risk' && normalizedMode === 'strict') {
      addFinding(
        findings,
        severity,
        rf,
        'nfr-status-residual-risk',
        `${nfrId} status residual-risk does not count as satisfied coverage in strict mode.`
      );
    }
  }

  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  return { ok: errors.length === 0, mode: normalizedMode, findings, errors, warnings };
}

export function mergeCoverageResults(...results) {
  const findings = results.flatMap((result) => result.findings || []);
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  const mode = results.find((result) => result.mode)?.mode || 'off';
  return {
    ok: errors.length === 0,
    mode,
    findings,
    errors,
    warnings
  };
}
