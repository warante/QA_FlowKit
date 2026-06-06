import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ensureDir, pathExists, readText, relativeTo } from './utils.mjs';

const RUNS_RELATIVE = '.qa-ai/state/runs';
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 50;
const TRANSIENT_RENAME_CODES = new Set(['EACCES', 'EBUSY', 'EPERM']);

export const RUN_STATUSES = new Set(['active', 'blocked', 'completed']);
export const PHASE_STATUSES = new Set(['pending', 'active', 'blocked', 'completed', 'skipped']);

function runsRoot(cwd) {
  return path.join(cwd, RUNS_RELATIVE);
}

function activePointerPath(cwd) {
  return path.join(runsRoot(cwd), 'active.json');
}

function assertSafeRunId(runId) {
  const value = String(runId || '');
  if (!value || value === '.' || value === '..' || !/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid run ID: ${value || '(empty)'}`);
  }
  return value;
}

function runDir(cwd, runId) {
  return path.join(runsRoot(cwd), assertSafeRunId(runId));
}

function runSnapshotPath(cwd, runId) {
  return path.join(runDir(cwd, runId), 'run.json');
}

function eventsPath(cwd, runId) {
  return path.join(runDir(cwd, runId), 'events.jsonl');
}

function lockPath(cwd, runId) {
  return path.join(runDir(cwd, runId), '.lock');
}

async function renameWithRetry(source, destination) {
  const started = Date.now();
  while (true) {
    try {
      await fs.rename(source, destination);
      return;
    } catch (error) {
      if (!TRANSIENT_RENAME_CODES.has(error.code) || Date.now() - started >= LOCK_TIMEOUT_MS) {
        throw error;
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
}

export async function atomicWriteJson(filePath, data) {
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await ensureDir(path.dirname(filePath));
  try {
    await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await renameWithRetry(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true });
  }
}

async function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export async function withRunLock(cwd, runId, fn) {
  const lockFile = lockPath(cwd, runId);
  await ensureDir(path.dirname(lockFile));
  const started = Date.now();
  let handle;

  while (true) {
    try {
      handle = await fs.open(lockFile, 'wx');
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() - started >= LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out acquiring run lock for ${runId}. Retry the command.`, { cause: error });
      }
      await sleep(LOCK_RETRY_MS);
    }
  }

  try {
    return await fn();
  } finally {
    await handle.close();
    await fs.rm(lockFile, { force: true });
  }
}

export async function appendRunEvent(cwd, runId, event) {
  const filePath = eventsPath(cwd, runId);
  await ensureDir(path.dirname(filePath));
  const line = `${JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event
  })}\n`;
  await fs.appendFile(filePath, line, 'utf8');
}

export async function readRunSnapshot(cwd, runId) {
  const filePath = runSnapshotPath(cwd, runId);
  if (!(await pathExists(filePath))) {
    throw new Error(`Run not found: ${runId}`);
  }
  return JSON.parse(await readText(filePath));
}

export async function writeRunSnapshot(cwd, snapshot) {
  if (snapshot.status === 'completed') {
    const existing = (await pathExists(runSnapshotPath(cwd, snapshot.runId)))
      ? JSON.parse(await readText(runSnapshotPath(cwd, snapshot.runId)))
      : null;
    if (existing?.status === 'completed') {
      throw new Error(`Run ${snapshot.runId} is completed and immutable.`);
    }
  }

  snapshot.updatedAt = new Date().toISOString();
  await atomicWriteJson(runSnapshotPath(cwd, snapshot.runId), snapshot);
  return snapshot;
}

export async function getActiveRunId(cwd) {
  const pointer = activePointerPath(cwd);
  if (!(await pathExists(pointer))) return null;
  try {
    const data = JSON.parse(await readText(pointer));
    return data?.runId || null;
  } catch {
    return null;
  }
}

export async function setActiveRunId(cwd, runId) {
  await ensureDir(runsRoot(cwd));
  await atomicWriteJson(activePointerPath(cwd), { runId });
}

export async function clearActiveRunId(cwd) {
  const pointer = activePointerPath(cwd);
  if (await pathExists(pointer)) {
    await fs.rm(pointer, { force: true });
  }
}

export async function listRunIds(cwd) {
  const root = runsRoot(cwd);
  if (!(await pathExists(root))) return [];
  const items = await fs.readdir(root, { withFileTypes: true });
  return items
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort();
}

export async function createRunDirectory(cwd, runId) {
  const dir = runDir(cwd, runId);
  await ensureDir(runsRoot(cwd));
  try {
    await fs.mkdir(dir);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`Run already exists: ${runId}`, { cause: error });
    }
    throw error;
  }
  return dir;
}

export function createEmptyPhaseState() {
  return {
    status: 'pending',
    attempts: 0,
    outputs: [],
    baselineOutputs: [],
    baselineCaptured: false,
    lastValidation: null,
    blockedReason: null
  };
}

export function assertMutableRun(snapshot) {
  if (snapshot.status === 'completed') {
    throw new Error(`Run ${snapshot.runId} is completed and immutable.`);
  }
}

export function relativeRunPath(cwd, runId, fileName) {
  return relativeTo(cwd, path.join(runDir(cwd, runId), fileName));
}
