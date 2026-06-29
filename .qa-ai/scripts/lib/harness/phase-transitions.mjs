import { getConfigValue } from '../utils.mjs';
import { getPhaseMap, getPhaseSkipReason, getTrackPhaseOrder, normalizeQaTrack } from '../harness-contract.mjs';
import { buildPhaseBlockers } from '../harness-context.mjs';
import { interfaceLanguage, renderBlockers } from '../harness-messages.mjs';
import { createEmptyPhaseState } from '../harness-run-store.mjs';
import { collectOutputHashes, verifyPhaseInputs } from '../harness-validation.mjs';

export async function gatherPhaseBlockers({ cwd, phaseDef, snapshot, config, approvals }) {
  const phaseState = snapshot.phases?.[phaseDef.id];
  let currentOutputs = null;
  if (phaseState?.baselineCaptured) {
    currentOutputs = await collectOutputHashes(cwd, config, phaseDef.outputs || []);
  }
  const blockers = buildPhaseBlockers({
    cwd,
    phaseDef,
    snapshot,
    config,
    approvals,
    currentOutputs
  });
  const inputCheck = await verifyPhaseInputs(cwd, config, phaseDef);
  if (!inputCheck.ok) {
    blockers.push({
      type: 'missing-inputs',
      missing: inputCheck.missing,
      message: 'Required inputs are missing.'
    });
  }
  return blockers;
}

export function blockerHelp(blockers, config, phaseDef = null) {
  const enriched = (blockers || []).map((blocker) => ({
    ...blocker,
    phaseId: blocker.phaseId || phaseDef?.id,
    phaseName: blocker.phaseName || phaseDef?.name
  }));
  return renderBlockers(enriched, interfaceLanguage(config));
}

export function initializePhaseStates(contract, config) {
  const phaseMap = getPhaseMap(contract);
  const track = normalizeQaTrack(getConfigValue(config, 'project.qaTrack', 'standard'));
  const order = getTrackPhaseOrder(contract, track);
  const phases = {};

  for (const phaseId of order) {
    const def = phaseMap.get(phaseId);
    const skipReason = getPhaseSkipReason(config, def);
    phases[phaseId] = {
      ...createEmptyPhaseState(),
      status: skipReason ? 'skipped' : 'pending',
      skipReason: skipReason || null
    };
  }

  return { track, phases };
}

export function maybeUnblockEntryBlockedPhase(snapshot, blockers) {
  if (!snapshot.activePhaseId) return;
  const phaseState = snapshot.phases[snapshot.activePhaseId];
  if (phaseState.status === 'blocked' && phaseState.blockedReason === 'entry' && blockers.length === 0) {
    phaseState.status = 'active';
    phaseState.blockedReason = null;
    snapshot.status = 'active';
  }
}
