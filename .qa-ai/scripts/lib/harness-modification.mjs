export const MODIFICATION_GATE_PREFIX = 'modify-existing:';

export function modificationApprovalGateId(phaseId) {
  return `${MODIFICATION_GATE_PREFIX}${phaseId}`;
}

export function parseModificationApprovalGate(gate) {
  const text = String(gate || '').trim();
  if (!text.startsWith(MODIFICATION_GATE_PREFIX)) return null;
  const phaseId = text.slice(MODIFICATION_GATE_PREFIX.length);
  return phaseId || null;
}

export function isScopedModificationApprovalRecorded(approvals, phaseId) {
  const gate = modificationApprovalGateId(phaseId);
  return (approvals || []).some((item) => item.gate === gate && item.decision === 'approved');
}

export function findModifiedBaselineOutputs(baselineOutputs = [], currentOutputs = []) {
  const currentByPath = new Map(currentOutputs.map((item) => [item.path, item.sha256]));
  const modified = [];

  for (const baseline of baselineOutputs) {
    if (!baseline?.existedAtActivation) continue;
    const currentHash = currentByPath.get(baseline.path);
    if (currentHash && currentHash !== baseline.sha256) {
      modified.push({
        path: baseline.path,
        baselineSha256: baseline.sha256,
        currentSha256: currentHash
      });
    }
  }

  return modified;
}

export function buildModificationBlockers({ phaseDef, phaseState, currentOutputs, approvals = [] }) {
  if (phaseDef?.permissions?.modifyExisting !== 'approval') {
    return [];
  }

  const phaseId = phaseDef.id;
  const modified = findModifiedBaselineOutputs(phaseState?.baselineOutputs || [], currentOutputs);
  if (modified.length === 0) {
    return [];
  }

  const gate = modificationApprovalGateId(phaseId);
  if (isScopedModificationApprovalRecorded(approvals, phaseId)) {
    return [];
  }

  return [
    {
      type: 'modification',
      gate,
      paths: modified.map((item) => item.path),
      message: `Modification approval required for gate ${gate} (${modified.map((item) => item.path).join(', ')})`
    }
  ];
}
