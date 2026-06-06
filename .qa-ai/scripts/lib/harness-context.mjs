import { getConfigValue } from './utils.mjs';
import {
  buildWorkflowContext,
  getPhaseMap,
  getPhaseSkipReason,
  getTrackPhaseOrder,
  resolveContractPath
} from './harness-contract.mjs';
import { resolveHarnessRelativePath } from './harness-paths.mjs';
import { buildModificationBlockers, modificationApprovalGateId } from './harness-modification.mjs';

function resolveGuidancePaths(config, guidance) {
  return (guidance || []).map((item) => item);
}

function resolveInputRefs(cwd, config, inputs) {
  return (inputs || []).map((input) => {
    const relative = resolveContractPath(config, input.path, input.fallback);
    let safeRelative = relative;
    if (relative) {
      try {
        safeRelative = resolveHarnessRelativePath(cwd, relative, { label: 'phase input' }).relative;
      } catch {
        safeRelative = relative;
      }
    }
    return {
      path: safeRelative,
      required: Boolean(input.required)
    };
  });
}

function resolveOutputRefs(cwd, config, outputs) {
  return (outputs || []).map((output) => {
    const relative = resolveContractPath(config, output.path, output.fallback);
    let safeRelative = relative;
    if (relative) {
      try {
        safeRelative = resolveHarnessRelativePath(cwd, relative, { label: 'phase output' }).relative;
      } catch {
        safeRelative = relative;
      }
    }
    return {
      path: safeRelative,
      kind: output.kind || 'file'
    };
  });
}

export function buildPhaseBlockers({ cwd: _cwd, phaseDef, snapshot, config, approvals = [], currentOutputs = null }) {
  const blockers = [];
  const approvedGates = new Set((approvals || []).map((item) => item.gate));
  const phaseState = snapshot.phases?.[phaseDef.id];

  for (const gate of phaseDef.entryApprovals || []) {
    if (!approvedGates.has(gate)) {
      blockers.push({
        type: 'approval',
        gate,
        message: `Approval required: ${gate}`
      });
    }
  }

  if (phaseDef.requiresRfId && !snapshot.rfId) {
    blockers.push({
      type: 'rf',
      message: 'Official RF ID is required. Run: npx qa-flowkit run set-rf <id>'
    });
  }

  const requireOfficialRf = getConfigValue(config, 'requirements.requireOfficialRfId', true);
  if (phaseDef.id === 'gherkin' && requireOfficialRf && !snapshot.rfId) {
    if (!blockers.some((item) => item.type === 'rf')) {
      blockers.push({
        type: 'rf',
        message: 'Official RF ID is required before Gherkin generation.'
      });
    }
  }

  if (phaseState?.status === 'blocked' && phaseState.blockedReason === 'validation') {
    blockers.push({
      type: 'validation',
      retryable: true,
      message: 'Phase is blocked after repeated validation failures. Run: npx qa-flowkit run retry'
    });
  }

  if (currentOutputs && phaseState?.baselineCaptured) {
    blockers.push(
      ...buildModificationBlockers({
        phaseDef,
        phaseState,
        currentOutputs,
        approvals
      })
    );
  }

  return blockers;
}

export function buildPhasePacket({ cwd, snapshot, phaseDef, config, blockers = [] }) {
  const phaseState = snapshot.phases?.[phaseDef.id] || { status: 'pending' };
  const modificationGate =
    phaseDef.permissions?.modifyExisting === 'approval' ? modificationApprovalGateId(phaseDef.id) : null;

  return {
    runId: snapshot.runId,
    track: snapshot.track,
    rfId: snapshot.rfId || null,
    phase: {
      id: phaseDef.id,
      name: phaseDef.name,
      status: phaseState.status,
      slashCommand: phaseDef.slashCommand || '/qa-full-flow',
      guidance: resolveGuidancePaths(config, phaseDef.guidance),
      inputs: resolveInputRefs(cwd, config, phaseDef.inputs),
      outputs: resolveOutputRefs(cwd, config, phaseDef.outputs),
      validators: [...(phaseDef.validators || [])],
      permissions: { ...phaseDef.permissions },
      attempts: phaseState.attempts || 0,
      modificationGate
    },
    blockers,
    recommendedCommand:
      phaseState.status === 'blocked' && phaseState.blockedReason === 'validation'
        ? 'npx qa-flowkit run retry'
        : 'npx qa-flowkit run check'
  };
}

export function buildStatusReport({ snapshot, contract, config }) {
  const phaseMap = getPhaseMap(contract);
  const order = getTrackPhaseOrder(contract, snapshot.track);
  const phases = order.map((phaseId) => {
    const def = phaseMap.get(phaseId);
    const state = snapshot.phases?.[phaseId] || { status: 'pending' };
    const skipReason = state.status === 'skipped' ? getPhaseSkipReason(config, def) : null;
    return {
      id: phaseId,
      name: def?.name || phaseId,
      status: state.status,
      skipReason,
      blockedReason: state.blockedReason || null
    };
  });

  return {
    runId: snapshot.runId,
    status: snapshot.status,
    track: snapshot.track,
    rfId: snapshot.rfId || null,
    activePhaseId: snapshot.activePhaseId || null,
    phases,
    approvals: snapshot.approvals || [],
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt
  };
}

export function legacyPhaseCommand(phaseDef) {
  const parts = [];
  if (phaseDef.slashCommand) parts.push(phaseDef.slashCommand);
  const agentEntry = (phaseDef.guidance || []).find((item) => item.includes('/agents/'));
  if (agentEntry) parts.push(`load ${agentEntry}`);
  if ((phaseDef.validators || []).includes('validate-features')) {
    parts.push('node .qa-ai/scripts/validate-features.mjs');
  }
  return parts.join(' · ');
}

export function summarizeWorkflowContext(config) {
  return buildWorkflowContext(config);
}
