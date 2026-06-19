import { getConfigValue, loadQaAiConfig, pathExists, hashFile, resolveTestManagementSyncPlanPath } from './utils.mjs';
import { getPhaseMap, getPhaseSkipReason, getTrackPhaseOrder, loadWorkflowContract } from './harness-contract.mjs';
import { buildPhaseBlockers, buildPhasePacket, buildStatusReport } from './harness-context.mjs';
import { interfaceLanguage, renderBlockers } from './harness-messages.mjs';
import {
  appendRunEvent,
  assertMutableRun,
  createEmptyPhaseState,
  createRunDirectory,
  getActiveRunId,
  listRunIds,
  readRunSnapshot,
  setActiveRunId,
  withRunLock,
  writeRunSnapshot
} from './harness-run-store.mjs';
import { parseModificationApprovalGate, buildModificationBlockers } from './harness-modification.mjs';
import {
  assertNoteHasNoSecrets,
  assertConfigPathsSafe,
  collectOutputHashes,
  DEFAULT_MAX_VALIDATION_ATTEMPTS,
  ensurePhaseBaseline,
  runPhaseValidators,
  verifyPhaseInputs,
  verifyPhaseOutputs
} from './harness-validation.mjs';
import { normalizeQaTrack } from './harness-contract.mjs';

function sanitizeRunIdPart(value) {
  return (
    String(value || 'anon')
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'anon'
  );
}

function formatRunIdTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace('.', '');
}

export function buildRunId(rfId, { now = new Date(), disambiguator = 0 } = {}) {
  const stamp = formatRunIdTimestamp(now);
  const suffix = disambiguator > 0 ? `-${disambiguator}` : '';
  return `${sanitizeRunIdPart(rfId)}-${stamp}${suffix}`;
}

async function gatherPhaseBlockers({ cwd, phaseDef, snapshot, config, approvals }) {
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

function blockerHelp(blockers, config, phaseDef = null) {
  const enriched = (blockers || []).map((blocker) => ({
    ...blocker,
    phaseId: blocker.phaseId || phaseDef?.id,
    phaseName: blocker.phaseName || phaseDef?.name
  }));
  return renderBlockers(enriched, interfaceLanguage(config));
}

function initializePhaseStates(contract, config) {
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

function firstActionablePhaseId(snapshot, contract) {
  const order = getTrackPhaseOrder(contract, snapshot.track);
  for (const phaseId of order) {
    const state = snapshot.phases[phaseId];
    if (!state) continue;
    if (state.status === 'skipped' || state.status === 'completed') continue;
    return phaseId;
  }
  return null;
}

function syncRunStatus(snapshot) {
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

function maybeUnblockEntryBlockedPhase(snapshot, blockers) {
  if (!snapshot.activePhaseId) return;
  const phaseState = snapshot.phases[snapshot.activePhaseId];
  if (phaseState.status === 'blocked' && phaseState.blockedReason === 'entry' && blockers.length === 0) {
    phaseState.status = 'active';
    phaseState.blockedReason = null;
    snapshot.status = 'active';
  }
}

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

async function checkAndInvalidateSyncPlanApproval(cwd, snapshot, config, runId) {
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

export async function getActiveRunSnapshot(cwd) {
  const runId = await getActiveRunId(cwd);
  if (!runId) return null;
  return readRunSnapshot(cwd, runId);
}
