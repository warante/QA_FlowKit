import { hashFile, loadQaAiConfig, pathExists, resolveTestManagementSyncPlanPath } from '../utils.mjs';
import { getPhaseMap, loadWorkflowContract } from '../harness-contract.mjs';
import { buildPhasePacket } from '../harness-context.mjs';
import { parseModificationApprovalGate, buildModificationBlockers } from '../harness-modification.mjs';
import {
  appendRunEvent,
  assertMutableRun,
  getActiveRunId,
  readRunSnapshot,
  withRunLock,
  writeRunSnapshot
} from '../harness-run-store.mjs';
import { assertNoteHasNoSecrets, collectOutputHashes, ensurePhaseBaseline } from '../harness-validation.mjs';
import { gatherPhaseBlockers, maybeUnblockEntryBlockedPhase } from './phase-transitions.mjs';

export async function checkAndInvalidateSyncPlanApproval(cwd, snapshot, config, runId) {
  const existingApprovalIndex = (snapshot.approvals || []).findIndex(
    (item) => item.gate === 'external-write:test-management'
  );
  if (existingApprovalIndex === -1) return false;

  const approval = snapshot.approvals[existingApprovalIndex];
  if (!approval.planHash) return false;

  const { absPath: absSyncPlanPath } = await resolveTestManagementSyncPlanPath(cwd, config);

  if (await pathExists(absSyncPlanPath)) {
    const currentHash = await hashFile(absSyncPlanPath);
    if (currentHash !== approval.planHash) {
      snapshot.approvals.splice(existingApprovalIndex, 1);

      await appendRunEvent(cwd, runId, {
        type: 'approval_invalidated',
        gate: 'external-write:test-management',
        reason: 'plan_hash_changed',
        previousHash: approval.planHash,
        currentHash
      });

      if (snapshot.activePhaseId === 'sync-apply') {
        const phaseState = snapshot.phases['sync-apply'];
        phaseState.status = 'blocked';
        phaseState.blockedReason = 'entry';
        snapshot.status = 'blocked';
      }
      return true;
    }
  }
  return false;
}

export async function retryPhase(cwd) {
  const runId = await getActiveRunId(cwd);
  if (!runId) throw new Error('No active run. Start one with: npx qa-flowkit run start');

  return withRunLock(cwd, runId, async () => {
    const snapshot = await readRunSnapshot(cwd, runId);
    assertMutableRun(snapshot);

    const phaseId = snapshot.activePhaseId;
    if (!phaseId) throw new Error('No active phase. Run: npx qa-flowkit run next');

    const phaseState = snapshot.phases[phaseId];
    if (phaseState.status !== 'blocked' || phaseState.blockedReason !== 'validation') {
      throw new Error('Retry only applies to the active phase blocked by validation failures.');
    }

    const previousAttempts = phaseState.attempts || 0;
    phaseState.attempts = 0;
    phaseState.status = 'active';
    phaseState.blockedReason = null;
    snapshot.status = 'active';

    await writeRunSnapshot(cwd, snapshot);
    await appendRunEvent(cwd, runId, {
      type: 'phase.retry_requested',
      phaseId,
      previousAttempts
    });

    const contract = await loadWorkflowContract(cwd);
    const configInfo = await loadQaAiConfig(cwd);
    const phaseDef = getPhaseMap(contract).get(phaseId);

    return {
      ok: true,
      runId,
      phaseId,
      status: 'active',
      attempts: 0,
      previousAttempts,
      message: 'Validation attempts reset. Fix artifacts and run: npx qa-flowkit run check',
      phase: buildPhasePacket({
        cwd,
        snapshot,
        phaseDef,
        config: configInfo.data,
        blockers: []
      }).phase
    };
  });
}

export async function approveGate(cwd, gate, { note = '' } = {}) {
  const runId = await getActiveRunId(cwd);
  if (!runId) throw new Error('No active run. Start one with: npx qa-flowkit run start');
  const gateId = String(gate || '').trim();
  if (!gateId) throw new Error('Approval gate is required.');
  assertNoteHasNoSecrets(note);

  return withRunLock(cwd, runId, async () => {
    const snapshot = await readRunSnapshot(cwd, runId);
    assertMutableRun(snapshot);

    const scopedPhaseId = parseModificationApprovalGate(gateId);
    if (scopedPhaseId) {
      if (scopedPhaseId !== snapshot.activePhaseId) {
        throw new Error(
          `Gate ${gateId} is scoped to phase ${scopedPhaseId}; active phase is ${snapshot.activePhaseId || 'none'}.`
        );
      }
      const contract = await loadWorkflowContract(cwd);
      const configInfo = await loadQaAiConfig(cwd);
      const phaseDef = getPhaseMap(contract).get(scopedPhaseId);
      const phaseState = snapshot.phases[scopedPhaseId];
      const currentOutputs = await collectOutputHashes(cwd, configInfo.data, phaseDef.outputs || []);
      const pending = buildModificationBlockers({
        phaseDef,
        phaseState,
        currentOutputs,
        approvals: snapshot.approvals
      });
      if (pending.length === 0) {
        throw new Error(`Gate ${gateId} is not required for the current phase outputs.`);
      }
    }

    const existing = snapshot.approvals || [];
    let recordedHash = null;
    if (!existing.some((item) => item.gate === gateId)) {
      const approvalObj = {
        gate: gateId,
        decision: 'approved',
        phaseId: scopedPhaseId || snapshot.activePhaseId || null,
        timestamp: new Date().toISOString(),
        note: note ? String(note).trim() : ''
      };
      if (gateId === 'external-write:test-management') {
        const configInfo = await loadQaAiConfig(cwd);
        const { absPath: absSyncPlanPath } = await resolveTestManagementSyncPlanPath(cwd, configInfo.data);
        if (await pathExists(absSyncPlanPath)) {
          recordedHash = await hashFile(absSyncPlanPath);
          approvalObj.planHash = recordedHash;
        }
      }
      existing.push(approvalObj);
      snapshot.approvals = existing;
    }

    const contract = await loadWorkflowContract(cwd);
    const configInfo = await loadQaAiConfig(cwd);
    const phaseMap = getPhaseMap(contract);

    if (snapshot.activePhaseId) {
      const phaseDef = phaseMap.get(snapshot.activePhaseId);
      const phaseState = snapshot.phases[snapshot.activePhaseId];
      await ensurePhaseBaseline(cwd, configInfo.data, phaseState, phaseDef);
      const blockers = await gatherPhaseBlockers({
        cwd,
        phaseDef,
        snapshot,
        config: configInfo.data,
        approvals: snapshot.approvals
      });
      maybeUnblockEntryBlockedPhase(snapshot, blockers);
    }

    await writeRunSnapshot(cwd, snapshot);
    await appendRunEvent(cwd, runId, {
      type: 'approval.recorded',
      gate: gateId,
      phaseId: scopedPhaseId || snapshot.activePhaseId || null,
      ...(recordedHash ? { planHash: recordedHash } : {})
    });
    return snapshot;
  });
}
