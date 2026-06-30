import { loadQaAiConfig } from './utils.mjs';
import { getPhaseMap, getTrackPhaseOrder, loadWorkflowContract } from './harness-contract.mjs';
import { buildPhaseBlockers, buildPhasePacket, buildStatusReport } from './harness-context.mjs';
import {
  appendRunEvent,
  assertMutableRun,
  createRunDirectory,
  getActiveRunId,
  listRunIds,
  readRunSnapshot,
  setActiveRunId,
  withRunLock,
  writeRunSnapshot
} from './harness-run-store.mjs';
import { buildModificationBlockers } from './harness-modification.mjs';
import {
  assertConfigPathsSafe,
  collectOutputHashes,
  DEFAULT_MAX_VALIDATION_ATTEMPTS,
  ensurePhaseBaseline,
  runPhaseValidators,
  verifyPhaseInputs,
  verifyPhaseOutputs
} from './harness-validation.mjs';
import { buildRunId } from './harness/run-id.mjs';
import { firstActionablePhaseId, syncRunStatus } from './harness/run-status.mjs';
import {
  blockerHelp,
  gatherPhaseBlockers,
  initializePhaseStates,
  maybeUnblockEntryBlockedPhase
} from './harness/phase-transitions.mjs';
import { checkAndInvalidateSyncPlanApproval } from './harness/approvals.mjs';
export { approveGate, retryPhase } from './harness/approvals.mjs';

export { buildRunId } from './harness/run-id.mjs';

export async function startRun(cwd, { rfId = null, now = new Date() } = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  if (!configInfo.exists) {
    throw new Error('qa-ai.config.yaml is missing. Run init first.');
  }

  const contract = await loadWorkflowContract(cwd);
  assertConfigPathsSafe(cwd, configInfo.data, contract);

  let runId;
  for (let disambiguator = 0; ; disambiguator += 1) {
    const candidate = buildRunId(rfId, { now, disambiguator });
    try {
      await createRunDirectory(cwd, candidate);
      runId = candidate;
      break;
    } catch (error) {
      if (error.cause?.code !== 'EEXIST') throw error;
    }
  }
  const { track, phases } = initializePhaseStates(contract, configInfo.data);
  const createdAt = now.toISOString();

  const snapshot = {
    schemaVersion: 1,
    runId,
    workflowVersion: contract.schemaVersion,
    rfId: rfId ? String(rfId).trim() : null,
    track,
    status: 'active',
    activePhaseId: null,
    phases,
    approvals: [],
    createdAt,
    updatedAt: createdAt
  };

  await writeRunSnapshot(cwd, snapshot);
  await appendRunEvent(cwd, runId, { type: 'run.started', track, rfId: snapshot.rfId });
  await setActiveRunId(cwd, runId);

  return snapshot;
}

export async function getRunStatus(cwd, { runId = null } = {}) {
  const activeId = runId || (await getActiveRunId(cwd));
  if (!activeId) {
    return { active: false, runs: await listRunIds(cwd) };
  }

  const contract = await loadWorkflowContract(cwd);
  const configInfo = await loadQaAiConfig(cwd);
  const snapshot = await readRunSnapshot(cwd, activeId);
  let blockers = [];
  let phaseDef = null;
  if (snapshot.activePhaseId) {
    phaseDef = getPhaseMap(contract).get(snapshot.activePhaseId);
    if (phaseDef) {
      blockers = await gatherPhaseBlockers({
        cwd,
        phaseDef,
        snapshot,
        config: configInfo.data,
        approvals: snapshot.approvals
      });
    }
  }
  return {
    active: true,
    ...buildStatusReport({ snapshot, contract, config: configInfo.data }),
    blockers,
    blockerHelp: blockerHelp(blockers, configInfo.data, snapshot.activePhaseId ? phaseDef : null)
  };
}

export async function resumeRun(cwd, runId) {
  return withRunLock(cwd, runId, async () => {
    const snapshot = await readRunSnapshot(cwd, runId);
    if (snapshot.status === 'completed') {
      throw new Error(`Run ${runId} is completed and cannot be resumed.`);
    }

    const contract = await loadWorkflowContract(cwd);
    const configInfo = await loadQaAiConfig(cwd);
    const phaseMap = getPhaseMap(contract);
    const activePhaseId = snapshot.activePhaseId || firstActionablePhaseId(snapshot, contract);

    await setActiveRunId(cwd, runId);
    if (!activePhaseId) {
      await appendRunEvent(cwd, runId, { type: 'run.resumed' });
      return buildStatusReport({ snapshot, contract, config: configInfo.data });
    }

    snapshot.activePhaseId = activePhaseId;
    const phaseDef = phaseMap.get(activePhaseId);
    const phaseState = snapshot.phases[activePhaseId];
    await ensurePhaseBaseline(cwd, configInfo.data, phaseState, phaseDef);
    const blockers = await gatherPhaseBlockers({
      cwd,
      phaseDef,
      snapshot,
      config: configInfo.data,
      approvals: snapshot.approvals
    });

    if (phaseState.status === 'pending') {
      phaseState.status = blockers.length > 0 ? 'blocked' : 'active';
      phaseState.blockedReason = blockers.length > 0 ? 'entry' : null;
      snapshot.status = blockers.length > 0 ? 'blocked' : 'active';
    } else {
      maybeUnblockEntryBlockedPhase(snapshot, blockers);
    }

    await writeRunSnapshot(cwd, snapshot);
    await appendRunEvent(cwd, runId, { type: 'run.resumed', phaseId: activePhaseId });

    return buildPhasePacket({
      cwd,
      snapshot,
      phaseDef,
      config: configInfo.data,
      blockers
    });
  });
}

export async function nextPhase(cwd) {
  const runId = await getActiveRunId(cwd);
  if (!runId) throw new Error('No active run. Start one with: npx qa-flowkit run start');

  return withRunLock(cwd, runId, async () => {
    const contract = await loadWorkflowContract(cwd);
    const configInfo = await loadQaAiConfig(cwd);
    const snapshot = await readRunSnapshot(cwd, runId);
    assertMutableRun(snapshot);

    const hashChanged = await checkAndInvalidateSyncPlanApproval(cwd, snapshot, configInfo.data, runId);
    if (hashChanged) {
      await writeRunSnapshot(cwd, snapshot);
    }

    const phaseMap = getPhaseMap(contract);
    const order = getTrackPhaseOrder(contract, snapshot.track);

    let targetPhaseId = snapshot.activePhaseId;
    if (targetPhaseId) {
      const current = snapshot.phases[targetPhaseId];
      if (current?.status === 'active' || current?.status === 'blocked') {
        const phaseDef = phaseMap.get(targetPhaseId);
        await ensurePhaseBaseline(cwd, configInfo.data, current, phaseDef);
        const blockers = await gatherPhaseBlockers({
          cwd,
          phaseDef,
          snapshot,
          config: configInfo.data,
          approvals: snapshot.approvals
        });
        maybeUnblockEntryBlockedPhase(snapshot, blockers);
        await writeRunSnapshot(cwd, snapshot);
        return buildPhasePacket({
          cwd,
          snapshot,
          phaseDef,
          config: configInfo.data,
          blockers
        });
      }
    }

    targetPhaseId = null;
    for (const phaseId of order) {
      const state = snapshot.phases[phaseId];
      if (state.status === 'pending') {
        targetPhaseId = phaseId;
        break;
      }
    }

    if (!targetPhaseId) {
      syncRunStatus(snapshot);
      await writeRunSnapshot(cwd, snapshot);
      return buildStatusReport({ snapshot, contract, config: configInfo.data });
    }

    const phaseDef = phaseMap.get(targetPhaseId);
    const phaseState = snapshot.phases[targetPhaseId];
    snapshot.activePhaseId = targetPhaseId;
    const baselineOutputs = await ensurePhaseBaseline(cwd, configInfo.data, phaseState, phaseDef);
    const blockers = await gatherPhaseBlockers({
      cwd,
      phaseDef,
      snapshot,
      config: configInfo.data,
      approvals: snapshot.approvals
    });

    if (blockers.length > 0) {
      phaseState.status = 'blocked';
      phaseState.blockedReason = 'entry';
      snapshot.status = 'blocked';
      await writeRunSnapshot(cwd, snapshot);
      await appendRunEvent(cwd, runId, {
        type: 'phase.blocked',
        phaseId: targetPhaseId,
        blockers: blockers.map((item) => item.type),
        baselineOutputs: baselineOutputs.map((item) => item.path)
      });
      return buildPhasePacket({
        cwd,
        snapshot,
        phaseDef,
        config: configInfo.data,
        blockers
      });
    }

    phaseState.status = 'active';
    phaseState.blockedReason = null;
    snapshot.status = 'active';
    await writeRunSnapshot(cwd, snapshot);
    await appendRunEvent(cwd, runId, {
      type: 'phase.activated',
      phaseId: targetPhaseId,
      baselineOutputs: baselineOutputs.map((item) => item.path)
    });
    if (targetPhaseId === 'sync-apply') {
      await appendRunEvent(cwd, runId, { type: 'sync_apply.started', phaseId: targetPhaseId });
    }
    if (targetPhaseId === 'sync-verify') {
      await appendRunEvent(cwd, runId, { type: 'sync_verify.started', phaseId: targetPhaseId });
    }

    return buildPhasePacket({
      cwd,
      snapshot,
      phaseDef,
      config: configInfo.data,
      blockers: []
    });
  });
}

export async function checkPhase(cwd, { maxAttempts = DEFAULT_MAX_VALIDATION_ATTEMPTS } = {}) {
  const runId = await getActiveRunId(cwd);
  if (!runId) throw new Error('No active run. Start one with: npx qa-flowkit run start');

  return withRunLock(cwd, runId, async () => {
    const contract = await loadWorkflowContract(cwd);
    const configInfo = await loadQaAiConfig(cwd);
    const snapshot = await readRunSnapshot(cwd, runId);
    assertMutableRun(snapshot);

    const hashChanged = await checkAndInvalidateSyncPlanApproval(cwd, snapshot, configInfo.data, runId);
    if (hashChanged) {
      await writeRunSnapshot(cwd, snapshot);
    }

    const phaseId = snapshot.activePhaseId;
    if (!phaseId) throw new Error('No active phase. Run: npx qa-flowkit run next');

    const phaseMap = getPhaseMap(contract);
    const phaseDef = phaseMap.get(phaseId);
    const phaseState = snapshot.phases[phaseId];

    if (phaseState.status === 'blocked' && phaseState.blockedReason === 'validation') {
      const blockers = [
        { type: 'validation', retryable: true, message: 'Phase is blocked after repeated validation failures.' }
      ];
      return {
        ok: false,
        phaseId,
        blockers,
        blockerHelp: blockerHelp(blockers, configInfo.data, phaseDef),
        blocked: true,
        retryable: true,
        message: 'Phase is blocked. Run: npx qa-flowkit run retry'
      };
    }

    const currentOutputs = await collectOutputHashes(cwd, configInfo.data, phaseDef.outputs || []);
    const blockers = buildPhaseBlockers({
      cwd,
      phaseDef,
      snapshot,
      config: configInfo.data,
      approvals: snapshot.approvals,
      currentOutputs
    });
    if (blockers.length > 0) {
      if (blockers.some((item) => item.type === 'validation')) {
        return {
          ok: false,
          phaseId,
          blockers,
          blockerHelp: blockerHelp(blockers, configInfo.data, phaseDef),
          blocked: true,
          retryable: true,
          message: 'Phase cannot advance while validation blockers remain.'
        };
      }
      phaseState.status = 'blocked';
      phaseState.blockedReason = 'entry';
      snapshot.status = 'blocked';
      await writeRunSnapshot(cwd, snapshot);
      return {
        ok: false,
        phaseId,
        blockers,
        blockerHelp: blockerHelp(blockers, configInfo.data, phaseDef),
        message: 'Phase cannot advance while blockers remain.'
      };
    }

    const inputCheck = await verifyPhaseInputs(cwd, configInfo.data, phaseDef);
    if (!inputCheck.ok) {
      const blockers = [
        { type: 'missing-inputs', missing: inputCheck.missing, message: 'Required inputs are missing.' }
      ];
      return {
        ok: false,
        phaseId,
        blockers,
        blockerHelp: blockerHelp(blockers, configInfo.data, phaseDef),
        missingInputs: inputCheck.missing,
        message: 'Required inputs are missing.'
      };
    }

    const outputCheck = await verifyPhaseOutputs(cwd, configInfo.data, phaseDef);
    if (!outputCheck.ok) {
      phaseState.attempts = (phaseState.attempts || 0) + 1;
      phaseState.lastValidation = {
        ok: false,
        missingOutputs: outputCheck.missing,
        timestamp: new Date().toISOString()
      };
      if (phaseState.attempts >= maxAttempts) {
        phaseState.status = 'blocked';
        phaseState.blockedReason = 'validation';
        snapshot.status = 'blocked';
      } else {
        phaseState.status = 'active';
        phaseState.blockedReason = null;
      }
      await writeRunSnapshot(cwd, snapshot);
      await appendRunEvent(cwd, runId, {
        type: 'phase.validation_failed',
        phaseId,
        reason: 'missing_outputs',
        missing: outputCheck.missing
      });
      return {
        ok: false,
        phaseId,
        missingOutputs: outputCheck.missing,
        attempts: phaseState.attempts,
        blocked: phaseState.status === 'blocked',
        blockerHelp:
          phaseState.status === 'blocked'
            ? blockerHelp(
                [
                  {
                    type: 'validation',
                    retryable: true,
                    message: 'Phase is blocked after repeated validation failures.'
                  }
                ],
                configInfo.data,
                phaseDef
              )
            : []
      };
    }

    const modificationBlockers = buildModificationBlockers({
      phaseDef,
      phaseState,
      currentOutputs,
      approvals: snapshot.approvals
    });
    if (modificationBlockers.length > 0) {
      return {
        ok: false,
        phaseId,
        blockers: modificationBlockers,
        blockerHelp: blockerHelp(modificationBlockers, configInfo.data, phaseDef),
        message: 'Modified pre-existing outputs require scoped approval before completion.'
      };
    }

    const validatorResult = await runPhaseValidators(cwd, configInfo.data, phaseDef);
    phaseState.attempts = (phaseState.attempts || 0) + 1;
    phaseState.lastValidation = {
      ok: validatorResult.ok,
      results: validatorResult.results,
      timestamp: new Date().toISOString()
    };

    const advisoryCustomFailures = validatorResult.results.filter(
      (result) => result.custom && !result.blocking && !result.ok
    );
    if (advisoryCustomFailures.length > 0) {
      await appendRunEvent(cwd, runId, {
        type: 'phase.validation_warning',
        phaseId,
        results: advisoryCustomFailures
      });
    }

    if (!validatorResult.ok) {
      if (phaseState.attempts >= maxAttempts) {
        phaseState.status = 'blocked';
        phaseState.blockedReason = 'validation';
        snapshot.status = 'blocked';
      } else {
        phaseState.status = 'active';
        phaseState.blockedReason = null;
      }
      await writeRunSnapshot(cwd, snapshot);
      await appendRunEvent(cwd, runId, {
        type: 'phase.validation_failed',
        phaseId,
        results: validatorResult.results
      });
      return {
        ok: false,
        phaseId,
        validation: validatorResult,
        attempts: phaseState.attempts,
        blocked: phaseState.status === 'blocked',
        blockerHelp:
          phaseState.status === 'blocked'
            ? blockerHelp(
                [
                  {
                    type: 'validation',
                    retryable: true,
                    message: 'Phase is blocked after repeated validation failures.'
                  }
                ],
                configInfo.data,
                phaseDef
              )
            : []
      };
    }

    phaseState.outputs = currentOutputs;
    phaseState.status = 'completed';
    phaseState.blockedReason = null;
    phaseState.lastValidation.ok = true;

    const nextId = (() => {
      const phaseOrder = getTrackPhaseOrder(contract, snapshot.track);
      const index = phaseOrder.indexOf(phaseId);
      for (let i = index + 1; i < phaseOrder.length; i += 1) {
        const state = snapshot.phases[phaseOrder[i]];
        if (state.status === 'pending') return phaseOrder[i];
      }
      return null;
    })();

    snapshot.activePhaseId = nextId;
    syncRunStatus(snapshot);
    await writeRunSnapshot(cwd, snapshot);
    await appendRunEvent(cwd, runId, {
      type: 'phase.completed',
      phaseId,
      outputs: currentOutputs
    });

    return {
      ok: true,
      phaseId,
      completed: true,
      nextPhaseId: nextId,
      status: snapshot.status,
      outputs: currentOutputs
    };
  });
}

export async function setRfId(cwd, rfId) {
  const runId = await getActiveRunId(cwd);
  if (!runId) throw new Error('No active run. Start one with: npx qa-flowkit run start');
  const normalized = String(rfId || '').trim();
  if (!normalized) throw new Error('RF ID is required.');

  return withRunLock(cwd, runId, async () => {
    const snapshot = await readRunSnapshot(cwd, runId);
    assertMutableRun(snapshot);
    snapshot.rfId = normalized;

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
    await appendRunEvent(cwd, runId, { type: 'rf.set', rfId: normalized });
    return snapshot;
  });
}

export async function getActiveRunSnapshot(cwd) {
  const runId = await getActiveRunId(cwd);
  if (!runId) return null;
  return readRunSnapshot(cwd, runId);
}
