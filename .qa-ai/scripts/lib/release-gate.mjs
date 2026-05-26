export const GATE_DECISIONS = ['PASS', 'CONCERNS', 'FAIL', 'WAIVED', 'PENDING'];

export function normalizeGateDecision(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

export function normalizeRiskList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

export function validateReleaseGateData(data, { source = 'release gate' } = {}) {
  const errors = [];
  const decision = normalizeGateDecision(data?.decision);

  if (!GATE_DECISIONS.includes(decision)) {
    errors.push(`${source}: decision must be one of ${GATE_DECISIONS.join(', ')}.`);
    return { decision, errors };
  }

  if (decision === 'PENDING') {
    errors.push(`${source}: decision is PENDING; set PASS, CONCERNS, FAIL or WAIVED after review.`);
  }

  const approver = String(data?.approver || '').trim();
  const waivedReason = String(data?.waived_reason || data?.waivedReason || '').trim();
  const risks = normalizeRiskList(data?.open_risks ?? data?.openRisks);
  const evidence = normalizeRiskList(data?.evidence_paths ?? data?.evidencePaths);
  const coverage = String(data?.coverage_summary ?? data?.coverageSummary ?? '').trim();

  if (!coverage) {
    errors.push(`${source}: coverage_summary is required.`);
  }

  if (evidence.length === 0) {
    errors.push(`${source}: evidence_paths must list at least one repository-relative path.`);
  }

  if (['CONCERNS', 'FAIL'].includes(decision) && risks.length === 0) {
    errors.push(`${source}: open_risks must document at least one item when decision is ${decision}.`);
  }

  if (decision === 'WAIVED') {
    if (!approver) errors.push(`${source}: approver is required when decision is WAIVED.`);
    if (!waivedReason) errors.push(`${source}: waived_reason is required when decision is WAIVED.`);
  }

  if (decision === 'PASS' && risks.length === 1 && /^none documented$/i.test(risks[0])) {
    // valid explicit none
  } else if (decision === 'PASS' && risks.some((risk) => /^(fail|blocked|critical)/i.test(risk))) {
    errors.push(`${source}: PASS cannot be used with blocking open_risks text.`);
  }

  return { decision, errors, risks, evidence, approver, waivedReason, coverage };
}
