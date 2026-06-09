import path from 'node:path';
import { parseFeatureTags } from './feature-layout.mjs';
import { rfPattern } from './gherkin-validate.mjs';
import { normalizeColumn, splitMarkdownRow, isSeparatorRow, rowValues } from './markdown-table.mjs';

export const COVERAGE_MODES = ['off', 'advisory', 'strict'];

export const TEST_DESIGN_TECHNIQUES = [
  'equivalence-partitioning',
  'boundary-value-analysis',
  'decision-table',
  'state-transition',
  'pairwise',
  'error-guessing',
  'use-case-testing'
];

const POSITIVE_TYPES = new Set(['functional', 'regression', 'smoke', 'e2e', 'integration', 'api']);
const TRUE_VALUES = new Set(['true', 'yes', 'y', 'required', 'applicable', 'si', 'sí']);
const FALSE_VALUES = new Set(['false', 'no', 'n', 'not-applicable', 'not applicable', 'n/a', 'na']);
const SECTION_ALIASES = {
  'proposed tests': ['pruebas propuestas'],
  'coverage obligations': ['obligaciones de cobertura'],
  'security review': ['revision de seguridad', 'revisión de seguridad'],
  'residual coverage gaps': ['brechas de cobertura residual']
};

export function normalizeCoverageMode(value, fallback = 'off') {
  const mode = String(value || fallback)
    .trim()
    .toLowerCase();
  return COVERAGE_MODES.includes(mode) ? mode : fallback;
}

export function normalizeTechnique(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
}

export function techniqueIsKnown(value) {
  const technique = normalizeTechnique(value);
  return TEST_DESIGN_TECHNIQUES.includes(technique) || technique.startsWith('other:');
}

export function extractSection(content, heading) {
  const lines = String(content || '')
    .replace(/\r/g, '')
    .split('\n');
  const normalizedHeading = normalizeColumn(heading.replace(/^#+\s*/, ''));
  const acceptedHeadings = new Set([normalizedHeading, ...(SECTION_ALIASES[normalizedHeading] || [])]);
  const start = lines.findIndex((line) => {
    const match = line.trim().match(/^##\s+(.+)$/);
    return match && acceptedHeadings.has(normalizeColumn(match[1]));
  });
  if (start === -1) return '';
  const endOffset = lines.slice(start + 1).findIndex((line) => /^##\s+/.test(line.trim()));
  const end = endOffset === -1 ? lines.length : start + 1 + endOffset;
  return lines
    .slice(start + 1, end)
    .join('\n')
    .trim();
}

export function parseSectionTable(content, heading, requiredColumns = []) {
  const section = extractSection(content, heading);
  if (!section) {
    return { exists: false, errors: [], rows: [], header: [] };
  }

  const lines = section.split('\n');
  const tableLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    const cells = splitMarkdownRow(lines[index]);
    if (cells) tableLines.push({ line: index + 1, cells });
  }
  if (tableLines.length < 2) {
    return { exists: true, errors: [`Section "${heading}" must contain a Markdown table.`], rows: [], header: [] };
  }

  const header = tableLines[0].cells;
  const normalizedHeader = header.map(normalizeColumn);
  const errors = [];
  if (!isSeparatorRow(tableLines[1].cells)) {
    errors.push(`Section "${heading}" must have a separator row after the header.`);
  }
  for (const column of requiredColumns) {
    if (!normalizedHeader.includes(normalizeColumn(column))) {
      errors.push(`Section "${heading}" is missing required column "${column}".`);
    }
  }

  const rows = tableLines.slice(2).flatMap((entry) => {
    if (entry.cells.length !== header.length || entry.cells.every((cell) => !cell.trim())) return [];
    return [{ line: entry.line, values: rowValues(header, entry.cells) }];
  });
  return { exists: true, errors, rows, header };
}

function normalizeRf(value) {
  return String(value || '')
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .toUpperCase();
}

function rfFromText(value) {
  const match = String(value || '').match(rfPattern);
  return match ? normalizeRf(match[0]) : '';
}

function booleanValue(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

export function featureCoverageRecord(file, content) {
  const tags = parseFeatureTags(content);
  const rf = normalizeRf(tags.rf || rfFromText(path.basename(file)));
  const type = String(tags.type || 'functional')
    .trim()
    .toLowerCase();
  const techniques = [...String(content).matchAll(/^\s*#\s*Technique:\s*(.+)$/gim)]
    .flatMap((match) => match[1].split(/[+,]/))
    .map(normalizeTechnique)
    .filter(Boolean);
  const thenLine = String(content)
    .split(/\r?\n/)
    .find((line) => /^\s*(?:Then|Entonces)\b/i.test(line));
  return {
    file,
    rf,
    type,
    techniques,
    hasObservableThen: Boolean(thenLine && thenLine.replace(/^\s*(?:Then|Entonces)\s*/i, '').trim())
  };
}

function groupFeatures(features) {
  const groups = new Map();
  for (const feature of features) {
    if (!feature.rf) continue;
    const current = groups.get(feature.rf) || [];
    current.push(feature);
    groups.set(feature.rf, current);
  }
  return groups;
}

function proposalTechniques(proposalContent) {
  const table = parseSectionTable(proposalContent, 'Proposed tests', ['RF']);
  const byRf = new Map();
  const hasTechnique = table.header.some((column) => normalizeColumn(column) === 'technique');
  if (!hasTechnique) return { ...table, byRf };
  for (const row of table.rows) {
    const rf = normalizeRf(row.values.rf || rfFromText(JSON.stringify(row.values)));
    if (!rf) continue;
    const values = String(row.values.technique || '')
      .split(/[+,]/)
      .map(normalizeTechnique)
      .filter(Boolean);
    byRf.set(rf, [...new Set([...(byRf.get(rf) || []), ...values])]);
  }
  return { ...table, byRf };
}

function coverageObligations(proposalContent) {
  const table = parseSectionTable(proposalContent, 'Coverage obligations', [
    'RF',
    'Obligation',
    'Applicable',
    'Evidence',
    'Rationale'
  ]);
  const byRf = new Map();
  for (const row of table.rows) {
    const rf = normalizeRf(row.values.rf || rfFromText(JSON.stringify(row.values)));
    const obligation = String(row.values.obligation || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');
    if (!rf || !obligation) continue;
    const current = byRf.get(rf) || new Map();
    current.set(obligation, {
      applicable: booleanValue(row.values.applicable),
      evidence: String(row.values.evidence || '').trim(),
      rationale: String(row.values.rationale || '').trim()
    });
    byRf.set(rf, current);
  }
  return { ...table, byRf };
}

function addFinding(findings, severity, rf, rule, message) {
  findings.push({ severity, rf, rule, message });
}

function requiredSeverity(mode) {
  return mode === 'strict' ? 'error' : 'warning';
}

export function validateCoverage({ features, proposalContent = '', policy = {}, mode = 'off' }) {
  const normalizedMode = normalizeCoverageMode(mode);
  if (normalizedMode === 'off') {
    return { ok: true, mode: normalizedMode, findings: [], errors: [], warnings: [] };
  }

  const findings = [];
  const groups = groupFeatures(features);
  const obligations = coverageObligations(proposalContent);
  const techniques = proposalTechniques(proposalContent);
  const severity = requiredSeverity(normalizedMode);

  for (const error of [...obligations.errors, ...techniques.errors]) {
    addFinding(findings, severity, '', 'proposal-structure', error);
  }

  for (const [rf, rfFeatures] of groups.entries()) {
    const types = new Set(rfFeatures.map((feature) => feature.type));
    const rfTechniques = new Set([
      ...rfFeatures.flatMap((feature) => feature.techniques),
      ...(techniques.byRf.get(rf) || [])
    ]);
    const rfObligations = obligations.byRf.get(rf) || new Map();

    if (policy.requirePositive && ![...types].some((type) => POSITIVE_TYPES.has(type))) {
      addFinding(findings, severity, rf, 'positive', `${rf} requires at least one positive scenario.`);
    }
    if (policy.requireNegative && !types.has('negative')) {
      addFinding(findings, severity, rf, 'negative', `${rf} requires at least one @type:negative scenario.`);
    }
    if (policy.requireAlternative) {
      const alternative = rfObligations.get('alternative');
      const hasAlternative =
        (alternative?.applicable === true && alternative.evidence) ||
        types.has('edge-case') ||
        rfFeatures.filter((feature) => POSITIVE_TYPES.has(feature.type)).length > 1;
      if (!hasAlternative && alternative?.applicable !== false) {
        addFinding(
          findings,
          severity,
          rf,
          'alternative',
          `${rf} requires an alternative-flow scenario or a not-applicable rationale.`
        );
      }
    }

    const conditionalRules = [
      ['boundary', policy.requireBoundaryWhenApplicable, 'boundary-value-analysis'],
      ['accessibility', policy.requireAccessibilityWhenApplicable, 'accessibility'],
      ['performance', policy.requirePerformanceWhenApplicable, 'performance'],
      ['security', policy.requireSecurityReview, 'security']
    ];
    for (const [obligationName, enabled, expectedEvidence] of conditionalRules) {
      if (!enabled) continue;
      const obligation = rfObligations.get(obligationName);
      if (!obligation) {
        addFinding(
          findings,
          severity,
          rf,
          obligationName,
          `${rf} must declare whether ${obligationName} coverage is applicable.`
        );
        continue;
      }
      if (obligation.applicable === false && !obligation.rationale) {
        addFinding(
          findings,
          severity,
          rf,
          obligationName,
          `${rf} marks ${obligationName} not applicable without a rationale.`
        );
      }
      if (obligation.applicable === true) {
        let covered = Boolean(obligation.evidence);
        if (expectedEvidence === 'boundary-value-analysis') {
          covered = covered && rfTechniques.has(expectedEvidence);
        } else {
          covered = covered && types.has(expectedEvidence);
        }
        if (!covered) {
          addFinding(
            findings,
            severity,
            rf,
            obligationName,
            `${rf} marks ${obligationName} applicable but lacks matching evidence.`
          );
        }
      }
    }

    if (policy.requireTechniqueTraceability) {
      const invalid = [...rfTechniques].filter((technique) => !techniqueIsKnown(technique));
      if (rfTechniques.size === 0) {
        addFinding(findings, severity, rf, 'technique', `${rf} has no test-design technique recorded.`);
      }
      for (const technique of invalid) {
        addFinding(findings, severity, rf, 'technique', `${rf} uses unknown technique "${technique}".`);
      }
    }

    for (const feature of rfFeatures.filter((item) => item.type === 'negative')) {
      if (!feature.hasObservableThen) {
        addFinding(
          findings,
          severity,
          rf,
          'negative-observable-result',
          `${path.basename(feature.file)} must include an observable Then/Entonces result.`
        );
      }
    }
  }

  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  return { ok: errors.length === 0, mode: normalizedMode, findings, errors, warnings };
}
