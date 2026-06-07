const metricKeys = [
  'requirementToDesignMinutes',
  'timeToValidGherkinMinutes',
  'reviewCycles',
  'acceptanceCriteriaCovered',
  'acceptanceCriteriaEligible',
  'reworkMinutes',
  'retainedArtifacts',
  'escapedDesignDefects',
  'validatorFoundDefects',
  'manualAdaptationMinutes'
];

const qualitativeKeys = ['clarity', 'trust', 'ceremonyFit', 'errorActionability', 'adoptionIntent'];
const allowedTracks = new Set(['quick', 'standard', 'enterprise']);
const allowedCompleteness = new Set(['complete', 'retrospective-partial']);
const allowedPublication = new Set(['aggregate-only', 'reviewed-excerpts', 'none']);
const allowedSeverity = new Set(['P0', 'P1', 'P2', 'P3']);
const allowedAttribution = new Set(['flowkit', 'agent', 'repository', 'facilitation', 'unknown']);
const forbiddenKeyPattern = /(name|email|url|credential|token|secret|prompt|sourceCode|deviceId)/i;
const forbiddenValuePatterns = [
  { label: 'email address', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { label: 'URL', pattern: /\bhttps?:\/\/\S+/i },
  { label: 'token-like value', pattern: /\b(?:gh[opsu]_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{20,})\b/ }
];

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function validateWindow(window, label, errors, { allowNull = false } = {}) {
  if (window === null && allowNull) return;
  if (!window || typeof window !== 'object' || Array.isArray(window)) {
    errors.push(`${label} must be an object${allowNull ? ' or null' : ''}.`);
    return;
  }
  for (const key of metricKeys) {
    const value = window[key];
    if (value === null && allowNull) continue;
    if (!isFiniteNonNegative(value))
      errors.push(`${label}.${key} must be a non-negative number${allowNull ? ' or null' : ''}.`);
  }
  const covered = window.acceptanceCriteriaCovered;
  const eligible = window.acceptanceCriteriaEligible;
  if (isFiniteNonNegative(covered) && isFiniteNonNegative(eligible) && covered > eligible) {
    errors.push(`${label}.acceptanceCriteriaCovered cannot exceed acceptanceCriteriaEligible.`);
  }
}

function validateQualitative(scores, label, errors, { allowNull = false } = {}) {
  if (scores === null && allowNull) return;
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    errors.push(`${label} must be an object${allowNull ? ' or null' : ''}.`);
    return;
  }
  for (const key of qualitativeKeys) {
    const value = scores[key];
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      errors.push(`${label}.${key} must be an integer from 1 to 5.`);
    }
  }
}

function inspectForbiddenKeys(value, location, errors) {
  if (typeof value === 'string') {
    for (const candidate of forbiddenValuePatterns) {
      if (candidate.pattern.test(value)) errors.push(`${location} appears to contain a ${candidate.label}.`);
    }
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    const nestedLocation = `${location}.${key}`;
    if (forbiddenKeyPattern.test(key)) errors.push(`${nestedLocation} uses a forbidden sensitive-data field name.`);
    inspectForbiddenKeys(nested, nestedLocation, errors);
  }
}

export function validatePilotRecord(record, source = 'pilot record') {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return [`${source} must be a JSON object.`];
  if (record.schemaVersion !== 1) errors.push(`${source}.schemaVersion must be 1.`);
  if (!/^PILOT-[A-Z0-9-]+$/.test(record.pilotId || '')) errors.push(`${source}.pilotId must use PILOT-* format.`);
  if (!allowedTracks.has(record.track)) errors.push(`${source}.track must be quick, standard or enterprise.`);
  if (!allowedCompleteness.has(record.measurementCompleteness)) {
    errors.push(`${source}.measurementCompleteness must be complete or retrospective-partial.`);
  }
  if (record.consent?.obtained !== true) errors.push(`${source}.consent.obtained must be true.`);
  if (!allowedPublication.has(record.consent?.publication)) {
    errors.push(`${source}.consent.publication must be aggregate-only, reviewed-excerpts or none.`);
  }

  const partial = record.measurementCompleteness === 'retrospective-partial';
  validateWindow(record.windows?.baseline, `${source}.windows.baseline`, errors, { allowNull: partial });
  validateWindow(record.windows?.assisted, `${source}.windows.assisted`, errors, { allowNull: partial });
  validateQualitative(record.qualitative?.baseline, `${source}.qualitative.baseline`, errors, { allowNull: partial });
  validateQualitative(record.qualitative?.assisted, `${source}.qualitative.assisted`, errors, { allowNull: partial });

  if (!Array.isArray(record.issues)) errors.push(`${source}.issues must be an array.`);
  for (const [index, issue] of (record.issues || []).entries()) {
    if (!allowedSeverity.has(issue.severity)) errors.push(`${source}.issues[${index}].severity is invalid.`);
    if (!allowedAttribution.has(issue.attribution)) errors.push(`${source}.issues[${index}].attribution is invalid.`);
    if (!String(issue.summary || '').trim()) errors.push(`${source}.issues[${index}].summary is required.`);
  }
  if (!Array.isArray(record.limitations)) errors.push(`${source}.limitations must be an array.`);
  if (!Array.isArray(record.decisions)) errors.push(`${source}.decisions must be an array.`);
  if (partial && (record.limitations || []).length === 0) {
    errors.push(`${source}.limitations must explain missing retrospective measurements.`);
  }

  inspectForbiddenKeys(record, source, errors);
  return errors;
}

export function percentage(numerator, denominator) {
  if (!isFiniteNonNegative(numerator) || !isFiniteNonNegative(denominator) || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

export function metricComparison(baseline, assisted) {
  if (!Number.isFinite(baseline) || !Number.isFinite(assisted)) {
    return { baseline: baseline ?? null, assisted: assisted ?? null, absoluteDelta: null, percentageDelta: null };
  }
  return {
    baseline,
    assisted,
    absoluteDelta: assisted - baseline,
    percentageDelta: baseline === 0 ? null : ((assisted - baseline) / baseline) * 100
  };
}

export function summarizePilotRecord(record) {
  const baseline = record.windows?.baseline;
  const assisted = record.windows?.assisted;
  const metrics = {};
  for (const key of metricKeys) metrics[key] = metricComparison(baseline?.[key], assisted?.[key]);

  metrics.acceptanceCriteriaCoverage = {
    baseline: percentage(baseline?.acceptanceCriteriaCovered, baseline?.acceptanceCriteriaEligible),
    assisted: percentage(assisted?.acceptanceCriteriaCovered, assisted?.acceptanceCriteriaEligible)
  };

  const qualitative = {};
  for (const key of qualitativeKeys) {
    qualitative[key] = metricComparison(record.qualitative?.baseline?.[key], record.qualitative?.assisted?.[key]);
  }

  return {
    pilotId: record.pilotId,
    track: record.track,
    measurementCompleteness: record.measurementCompleteness,
    metrics,
    qualitative,
    issueCounts: Object.fromEntries(
      [...allowedSeverity].map((severity) => [
        severity,
        record.issues.filter((issue) => issue.severity === severity).length
      ])
    ),
    limitations: record.limitations
  };
}
