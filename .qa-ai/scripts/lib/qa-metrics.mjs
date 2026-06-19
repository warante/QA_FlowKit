import fs from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from './utils.mjs';

const RUNS_RELATIVE = '.qa-ai/state/runs';

function runsRoot(cwd) {
  return path.join(cwd, RUNS_RELATIVE);
}

function runDir(cwd, runId) {
  return path.join(runsRoot(cwd), runId);
}

function safeRunId(runId) {
  return /^[A-Za-z0-9._-]+$/.test(String(runId || '')) ? String(runId) : null;
}

function toMs(timestamp) {
  const ms = Date.parse(timestamp || '');
  return Number.isFinite(ms) ? ms : null;
}

function isoOrNull(timestamp) {
  return toMs(timestamp) === null ? null : new Date(timestamp).toISOString();
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function summarizePhase(phaseId, data) {
  const validationFailureRate =
    data.validationChecks === 0 ? null : Number((data.validationFailures / data.validationChecks).toFixed(4));
  return {
    phaseId,
    completed: data.completed,
    medianDurationMs: median(data.durations),
    p90DurationMs: percentile(data.durations, 90),
    validationFailures: data.validationFailures,
    validationChecks: data.validationChecks,
    validationFailureRate,
    retries: data.retries
  };
}

async function readJsonIfExists(filePath, warnings, runId) {
  if (!(await pathExists(filePath))) return null;
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    warnings.push(`Run ${runId}: failed to parse ${path.basename(filePath)} (${error.message}).`);
    return null;
  }
}

async function readEvents(filePath, warnings, runId) {
  if (!(await pathExists(filePath))) return [];
  const content = await fs.readFile(filePath, 'utf8');
  const events = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      const event = JSON.parse(line);
      if (event && typeof event === 'object') events.push(event);
    } catch (error) {
      warnings.push(`Run ${runId}: skipped malformed events.jsonl line ${index + 1} (${error.message}).`);
    }
  }
  return events;
}

async function listRunIds(cwd, requestedRunId) {
  if (requestedRunId) {
    const runId = safeRunId(requestedRunId);
    if (!runId) throw new Error(`Invalid run ID: ${requestedRunId}`);
    return (await pathExists(runDir(cwd, runId))) ? [runId] : [];
  }
  const root = runsRoot(cwd);
  if (!(await pathExists(root))) return [];
  const items = await fs.readdir(root, { withFileTypes: true });
  return items
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .filter((item) => safeRunId(item))
    .sort();
}

function terminalStatus(snapshot, events) {
  if (snapshot?.status === 'completed') return 'completed';
  if (snapshot?.status === 'blocked') return 'blocked';
  if (events.some((event) => event.type === 'phase.blocked')) return 'blocked';
  return 'in-progress';
}

function runStartMs(snapshot, events) {
  const startedEvent = events.find((event) => event.type === 'run.started');
  return toMs(startedEvent?.timestamp) ?? toMs(snapshot?.createdAt) ?? toMs(snapshot?.updatedAt);
}

function runEndMs(snapshot, events) {
  if (snapshot?.status !== 'completed') return null;
  const completedEvents = events.filter((event) => event.type === 'phase.completed' && toMs(event.timestamp) !== null);
  if (completedEvents.length) return Math.max(...completedEvents.map((event) => toMs(event.timestamp)));
  return toMs(snapshot?.updatedAt);
}

function ensurePhase(phaseMap, phaseId) {
  if (!phaseMap.has(phaseId)) {
    phaseMap.set(phaseId, {
      completed: 0,
      durations: [],
      validationFailures: 0,
      validationChecks: 0,
      retries: 0
    });
  }
  return phaseMap.get(phaseId);
}

function collectRunMetrics({ runId, snapshot, events }) {
  const phaseActivation = new Map();
  const phaseIds = new Set(Object.keys(snapshot?.phases || {}));
  const phaseStats = new Map();
  let approvalBlockedAt = null;
  const approvalWaitDurations = [];
  let reworkApprovals = 0;

  for (const event of events) {
    if (event.phaseId) phaseIds.add(event.phaseId);
    if (event.type === 'phase.activated' && event.phaseId) {
      const timestamp = toMs(event.timestamp);
      if (timestamp !== null && !phaseActivation.has(event.phaseId)) {
        phaseActivation.set(event.phaseId, timestamp);
      }
    }
    if (event.type === 'phase.blocked' && Array.isArray(event.blockers) && event.blockers.includes('approval')) {
      approvalBlockedAt = toMs(event.timestamp);
    }
    if (event.type === 'approval.recorded') {
      const timestamp = toMs(event.timestamp);
      if (approvalBlockedAt !== null && timestamp !== null && timestamp >= approvalBlockedAt) {
        approvalWaitDurations.push(timestamp - approvalBlockedAt);
        approvalBlockedAt = null;
      }
      if (String(event.gate || '').startsWith('modify-existing:')) reworkApprovals += 1;
    }
    if (event.type === 'phase.validation_failed' && event.phaseId) {
      const phase = ensurePhase(phaseStats, event.phaseId);
      phase.validationFailures += 1;
      phase.validationChecks += 1;
    }
    if (event.type === 'phase.completed' && event.phaseId) {
      const phase = ensurePhase(phaseStats, event.phaseId);
      phase.completed += 1;
      phase.validationChecks += 1;
      const activatedAt = phaseActivation.get(event.phaseId);
      const completedAt = toMs(event.timestamp);
      if (activatedAt !== undefined && completedAt !== null && completedAt >= activatedAt) {
        phase.durations.push(completedAt - activatedAt);
      }
    }
    if (event.type === 'phase.retry_requested' && event.phaseId) {
      ensurePhase(phaseStats, event.phaseId).retries += 1;
    }
  }

  for (const phaseId of phaseIds) ensurePhase(phaseStats, phaseId);

  const startedAtMs = runStartMs(snapshot, events);
  const completedAtMs = runEndMs(snapshot, events);
  return {
    runId,
    track: snapshot?.track || 'unknown',
    status: terminalStatus(snapshot, events),
    startedAt: startedAtMs === null ? null : new Date(startedAtMs).toISOString(),
    completedAt: completedAtMs === null ? null : new Date(completedAtMs).toISOString(),
    durationMs:
      startedAtMs !== null && completedAtMs !== null && completedAtMs >= startedAtMs
        ? completedAtMs - startedAtMs
        : null,
    approvalWaitDurations,
    reworkApprovals,
    phases: [...phaseStats.entries()].map(([phaseId, data]) => summarizePhase(phaseId, data))
  };
}

function emptySummary({ since = null, run = null, warnings = [] } = {}) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    filters: { since: isoOrNull(since), run: run || null },
    totals: {
      runs: 0,
      started: 0,
      completed: 0,
      blocked: 0,
      inProgress: 0,
      medianRunDurationMs: null,
      p90RunDurationMs: null,
      approvalWaitMedianMs: null,
      reworkApprovals: 0
    },
    tracks: {},
    phases: {},
    runs: [],
    warnings
  };
}

export async function collectQaMetrics(cwd, { since = null, run = null } = {}) {
  const warnings = [];
  const sinceMs = since ? toMs(since) : null;
  if (since && sinceMs === null) throw new Error(`Invalid --since date: ${since}`);

  const ids = await listRunIds(cwd, run);
  if (!ids.length) return emptySummary({ since, run, warnings });

  const runs = [];
  for (const runId of ids) {
    const dir = runDir(cwd, runId);
    const snapshot = await readJsonIfExists(path.join(dir, 'run.json'), warnings, runId);
    const events = await readEvents(path.join(dir, 'events.jsonl'), warnings, runId);
    const startedAtMs = runStartMs(snapshot, events);
    if (sinceMs !== null && (startedAtMs === null || startedAtMs < sinceMs)) continue;
    runs.push(collectRunMetrics({ runId, snapshot, events }));
  }

  const summary = emptySummary({ since, run, warnings });
  summary.runs = runs;
  summary.totals.runs = runs.length;
  summary.totals.started = runs.length;
  summary.totals.completed = runs.filter((item) => item.status === 'completed').length;
  summary.totals.blocked = runs.filter((item) => item.status === 'blocked').length;
  summary.totals.inProgress = runs.filter((item) => item.status === 'in-progress').length;
  summary.totals.medianRunDurationMs = median(runs.map((item) => item.durationMs).filter((item) => item !== null));
  summary.totals.p90RunDurationMs = percentile(
    runs.map((item) => item.durationMs).filter((item) => item !== null),
    90
  );
  summary.totals.approvalWaitMedianMs = median(runs.flatMap((item) => item.approvalWaitDurations));
  summary.totals.reworkApprovals = runs.reduce((sum, item) => sum + item.reworkApprovals, 0);

  const trackMap = new Map();
  const phaseMap = new Map();
  for (const runMetrics of runs) {
    const track = trackMap.get(runMetrics.track) || { runs: 0, completed: 0, blocked: 0, inProgress: 0 };
    track.runs += 1;
    if (runMetrics.status === 'completed') track.completed += 1;
    else if (runMetrics.status === 'blocked') track.blocked += 1;
    else track.inProgress += 1;
    trackMap.set(runMetrics.track, track);

    for (const phase of runMetrics.phases) {
      const aggregate = ensurePhase(phaseMap, phase.phaseId);
      aggregate.completed += phase.completed;
      if (phase.medianDurationMs !== null) aggregate.durations.push(phase.medianDurationMs);
      aggregate.validationFailures += phase.validationFailures;
      aggregate.validationChecks += phase.validationChecks;
      aggregate.retries += phase.retries;
    }
  }

  summary.tracks = Object.fromEntries([...trackMap.entries()].sort(([a], [b]) => a.localeCompare(b)));
  summary.phases = Object.fromEntries(
    [...phaseMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([phaseId, data]) => [phaseId, summarizePhase(phaseId, data)])
  );
  return summary;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export function formatQaMetricsHuman(metrics) {
  const lines = ['QA FlowKit metrics', ''];
  if (metrics.totals.runs === 0) {
    lines.push('No workflow runs found for the selected filters.');
  } else {
    lines.push(
      `Runs: ${metrics.totals.runs} started, ${metrics.totals.completed} completed, ${metrics.totals.blocked} blocked, ${metrics.totals.inProgress} in progress`
    );
    lines.push(`Median run duration: ${formatDuration(metrics.totals.medianRunDurationMs)}`);
    lines.push(`P90 run duration: ${formatDuration(metrics.totals.p90RunDurationMs)}`);
    lines.push(`Median approval wait: ${formatDuration(metrics.totals.approvalWaitMedianMs)}`);
    lines.push(`Rework approvals: ${metrics.totals.reworkApprovals}`);
    lines.push('');
    lines.push('By track:');
    for (const [track, values] of Object.entries(metrics.tracks)) {
      lines.push(`  ${track}: ${values.runs} runs (${values.completed} completed, ${values.blocked} blocked)`);
    }
    lines.push('');
    lines.push('By phase:');
    for (const [phaseId, phase] of Object.entries(metrics.phases)) {
      const rate = phase.validationFailureRate === null ? '-' : `${Math.round(phase.validationFailureRate * 100)}%`;
      lines.push(
        `  ${phaseId}: median ${formatDuration(phase.medianDurationMs)}, p90 ${formatDuration(
          phase.p90DurationMs
        )}, validation failure rate ${rate}, retries ${phase.retries}`
      );
    }
  }
  if (metrics.warnings.length) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of metrics.warnings) lines.push(`  - ${warning}`);
  }
  return `${lines.join('\n')}\n`;
}
