import path from 'node:path';
import { rfPattern } from './gherkin-validate.mjs';
import { parse as parseGherkin } from './gherkin-parser.mjs';
import { normalizeColumn } from './markdown-table.mjs';
import { normalizeRf, booleanValue } from './id-normalize.mjs';
import { parseSectionTable } from './table-helpers.mjs';

export { normalizeRf } from './id-normalize.mjs';
export { extractSection, parseSectionTable } from './table-helpers.mjs';

import { normalizeAdvisoryMode, ADVISORY_MODES } from './mode-normalize.mjs';

export const COVERAGE_MODES = ADVISORY_MODES;

export const TEST_DESIGN_TECHNIQUES = [
  'equivalence-partitioning',
  'boundary-value-analysis',
  'decision-table',
  'state-transition',
  'pairwise',
  'error-guessing',
  'use-case-testing'
];

/** Recognized AI-specific test design techniques (see .qa-ai/rules/ai-testing.rules.md). */
export const AI_TESTING_TECHNIQUES = [
  'adversarial',
  'statistical-consistency',
  'robustness-paraphrase',
  'safety-guardrails',
  'fairness-bias',
  'degradation-fallback',
  'pii-leakage'
];

const POSITIVE_TYPES = new Set(['functional', 'regression', 'smoke', 'e2e', 'integration', 'api']);

export function normalizeCoverageMode(value, fallback = 'off') {
  return normalizeAdvisoryMode(value, fallback);
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
  return (
    TEST_DESIGN_TECHNIQUES.includes(technique) ||
    AI_TESTING_TECHNIQUES.includes(technique) ||
    technique.startsWith('other:')
  );
}

export function rfFromText(value) {
  const match = String(value || '').match(rfPattern);
  return match ? normalizeRf(match[0]) : '';
}

export function featureCoverageRecord(file, content) {
  const ast = parseGherkin(content);

  const tags = {};
  if (ast.feature && ast.feature.tags) {
    for (const t of ast.feature.tags) {
      const tagText = t.name.startsWith('@') ? t.name.slice(1) : t.name;
      const colonIndex = tagText.indexOf(':');
      if (colonIndex > 0) {
        const key = tagText.slice(0, colonIndex).toLowerCase();
        const value = tagText.slice(colonIndex + 1).trim();
        tags[key] = value;
      } else {
        tags[tagText.toLowerCase()] = 'true';
      }
    }
  }

  const rf = normalizeRf(tags.rf || rfFromText(path.basename(file)));
  const type = String(tags.type || 'functional')
    .trim()
    .toLowerCase();

  const techniques = [];
  for (const comment of ast.comments) {
    const trimmedComment = comment.text.trim();
    const match = trimmedComment.match(/^#\s*Technique:\s*(.+)$/i);
    if (match) {
      const values = match[1].split(/[+,]/).map(normalizeTechnique).filter(Boolean);
      techniques.push(...values);
    }
  }

  let thenLine = '';
  let isAiComponent = false;
  const aiTechniquesFromTags = [];

  if (ast.feature && ast.feature.tags) {
    for (const t of ast.feature.tags) {
      if (t.name.toLowerCase() === '@ai-component') {
        isAiComponent = true;
      }
      if (t.name.toLowerCase().startsWith('@technique:')) {
        const value = t.name.slice('@technique:'.length);
        aiTechniquesFromTags.push(normalizeTechnique(value));
      }
    }
  }

  const scanNode = (node) => {
    if (node.tags) {
      for (const t of node.tags) {
        if (t.name.toLowerCase() === '@ai-component') {
          isAiComponent = true;
        }
        if (t.name.toLowerCase().startsWith('@technique:')) {
          const value = t.name.slice('@technique:'.length);
          aiTechniquesFromTags.push(normalizeTechnique(value));
        }
      }
    }
    if (node.steps) {
      for (const step of node.steps) {
        if (/^\s*(?:Then|Entonces)\b/i.test(step.keyword)) {
          if (!thenLine) {
            thenLine = `${step.keyword}${step.text}`;
          }
        }
      }
    }
    if (node.children) {
      node.children.forEach(scanNode);
    }
  };

  if (ast.feature) {
    scanNode(ast.feature);
  }

  const aiTechniques = [...new Set(aiTechniquesFromTags)].filter(Boolean);

  const testId = String(tags.id || '')
    .replace(/\s+/g, '-')
    .toUpperCase();

  return {
    file,
    rf,
    type,
    testId,
    techniques,
    hasObservableThen: Boolean(thenLine && thenLine.replace(/^\s*(?:Then|Entonces)\s*/i, '').trim()),
    isAiComponent,
    aiTechniques
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

/**
 * Validate AI-component technique coverage.
 *
 * @param {object} options
 * @param {object[]} options.features - featureCoverageRecord results
 * @param {object} options.proposalContent - raw proposal markdown
 * @param {string[]} options.requiredTechniques - from aiTesting.requiredTechniques config
 * @param {string} options.mode - 'off' | 'advisory' | 'strict'
 * @returns {{ ok: boolean, findings: object[], errors: object[], warnings: object[] }}
 */
export function validateAiCoverage({ features, proposalContent = '', requiredTechniques = [], mode = 'off' }) {
  const normalizedMode = normalizeCoverageMode(mode);
  if (normalizedMode === 'off' || requiredTechniques.length === 0) {
    return { ok: true, mode: normalizedMode, findings: [], errors: [], warnings: [] };
  }

  const findings = [];
  const severity = requiredSeverity(normalizedMode);

  // Parse the proposal table to find which RFs are marked as AI components
  const proposalTable = parseSectionTable(proposalContent, 'Proposed tests', ['RF']);
  const techniques = proposalTechniques(proposalContent);
  const aiComponentColumn = proposalTable.header.map(normalizeColumn).includes('ai component');

  for (const error of [...proposalTable.errors, ...techniques.errors]) {
    addFinding(findings, severity, '', 'proposal-structure', error);
  }

  const rfAiSet = new Set();
  if (aiComponentColumn) {
    for (const row of proposalTable.rows) {
      const isAi = booleanValue(row.values['ai component'] || row.values['ai-component']);
      const rf = normalizeRf(row.values.rf || rfFromText(JSON.stringify(row.values)));
      if (rf && isAi === true) rfAiSet.add(rf);
    }
  }

  // Feature-level cross-checks
  const groups = groupFeatures(features);
  for (const [rf, rfFeatures] of groups.entries()) {
    const isAiRf = rfAiSet.has(rf) || rfFeatures.some((f) => f.isAiComponent);
    if (!isAiRf) continue;

    // All scenarios in an AI RF must carry @ai-component
    for (const feature of rfFeatures) {
      if (!feature.isAiComponent) {
        addFinding(
          findings,
          severity,
          rf,
          'ai-component-tag',
          `${path.basename(feature.file)} belongs to AI RF ${rf} but is missing @ai-component tag.`
        );
      }
    }

    // Collect AI techniques declared in both planned tests and generated features.
    const coveredTechniques = new Set([
      ...(techniques.byRf.get(rf) || []).map(normalizeTechnique),
      ...rfFeatures.flatMap((f) => f.aiTechniques)
    ]);

    // Validate @technique tags are all known AI techniques
    for (const technique of coveredTechniques) {
      if (!AI_TESTING_TECHNIQUES.includes(technique) && !technique.startsWith('other:')) {
        addFinding(findings, severity, rf, 'ai-technique-unknown', `${rf} uses unknown AI technique "${technique}".`);
      }
    }

    // Ensure every required technique has at least one scenario
    for (const required of requiredTechniques.map(normalizeTechnique)) {
      if (!coveredTechniques.has(required)) {
        addFinding(
          findings,
          severity,
          rf,
          'ai-technique-missing',
          `${rf} (AI component) is missing required technique "${required}".`
        );
      }
    }
  }

  // Proposal cross-check: a feature with @ai-component must trace back to a proposal RF marked AI
  const featureAiRfs = new Set(features.filter((f) => f.isAiComponent && f.rf).map((f) => f.rf));
  for (const rf of rfAiSet) {
    if (!featureAiRfs.has(rf)) {
      addFinding(
        findings,
        severity,
        rf,
        'ai-component-mismatch',
        `Proposal marks ${rf} as an AI component but no linked feature carries @ai-component.`
      );
    }
  }
  for (const rf of featureAiRfs) {
    if (!rfAiSet.has(rf) && aiComponentColumn) {
      addFinding(
        findings,
        severity,
        rf,
        'ai-component-mismatch',
        `Features for ${rf} carry @ai-component but the proposal does not mark it as an AI component.`
      );
    }
  }

  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  return { ok: errors.length === 0, mode: normalizedMode, findings, errors, warnings };
}
