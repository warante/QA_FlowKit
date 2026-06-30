import { getTrackPhaseOrder } from '../harness-contract.mjs';

export function firstActionablePhaseId(snapshot, contract) {
  const order = getTrackPhaseOrder(contract, snapshot.track);
  for (const phaseId of order) {
    const state = snapshot.phases[phaseId];
    if (!state) continue;
    if (state.status === 'skipped' || state.status === 'completed') continue;
    return phaseId;
  }
  return null;
}

export function syncRunStatus(snapshot) {
  const order = Object.values(snapshot.phases || {});
  if (order.every((phase) => phase.status === 'completed' || phase.status === 'skipped')) {
    snapshot.status = 'completed';
    snapshot.activePhaseId = null;
    return;
  }
  if (order.some((phase) => phase.status === 'blocked')) {
    snapshot.status = 'blocked';
    return;
  }
  snapshot.status = 'active';
}
