import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getConfigValue, hashFile, pathExists, resolveRepoPath, writeFileSafe } from './utils.mjs';
import { globToRegex, resolveGlobs } from './glob.mjs';

const DEFAULT_PATH = '.qa-ai/output/execution-provenance.json';
const CONFIG_PATH = '.qa-ai/qa-ai.config.yaml';

function policy(config) {
  const value = getConfigValue(config, 'execution.provenance', {});
  const mode = value.mode ?? 'off';
  const environment = value.environment ?? 'local';
  const maxAgeHours = value.maxAgeHours ?? 24;
  if (
    !['off', 'advisory', 'strict'].includes(mode) ||
    !/^[a-zA-Z0-9._-]+$/.test(environment) ||
    !Number.isFinite(maxAgeHours) ||
    maxAgeHours <= 0
  )
    throw new Error('Invalid execution provenance policy.');
  return { mode, environment, maxAgeHours, manifestPath: value.manifestPath ?? DEFAULT_PATH };
}

function patterns(config) {
  return [
    ...getConfigValue(config, 'execution.resultsPaths', []),
    ...getConfigValue(config, 'execution.evalResultsPaths', [])
  ];
}

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    timeout: 10000,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error('Execution provenance requires an accessible Git repository with a commit.');
  return result.stdout.trim();
}

function head(cwd) {
  return git(cwd, ['rev-parse', '--verify', 'HEAD']);
}

function passingCommands(commands, config) {
  if (
    !Array.isArray(commands) ||
    commands.length === 0 ||
    commands.some((command) => !command?.id || command.status !== 'passed')
  )
    return false;
  const ids = new Set(commands.map((command) => command.id));
  if (ids.size !== commands.length) return false;
  const configured = getConfigValue(config, 'execution.commands', []);
  return (
    configured.filter((command) => command.required !== false).every((command) => ids.has(command.id)) &&
    (configured.length === 0 || commands.every((command) => configured.some((item) => item.id === command.id)))
  );
}

function cleanTree(cwd, config, manifestPath) {
  if (git(cwd, ['status', '--porcelain', '--untracked-files=no'])) return false;
  const untracked = git(cwd, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  const allowed = patterns(config).map(globToRegex);
  const manifest = path.relative(cwd, resolveRepoPath(cwd, manifestPath)).replaceAll('\\', '/');
  return untracked.every(
    (file) => file === manifest || file.startsWith('.qa-ai/state/') || allowed.some((regex) => regex.test(file))
  );
}

async function artifacts(cwd, config) {
  const files = new Set();
  const configured = patterns(config);
  if (configured.length === 0)
    throw new Error('Execution provenance requires configured resultsPaths or evalResultsPaths.');
  for (const pattern of configured) {
    const matches = await resolveGlobs(cwd, [pattern]);
    if (matches.length === 0) throw new Error(`No execution evidence matches configured pattern: ${pattern}`);
    for (const file of matches) files.add(file);
  }
  const records = [];
  for (const file of [...files].sort()) {
    const relative = path.relative(cwd, file).replaceAll('\\', '/');
    const resolved = resolveRepoPath(cwd, relative, { label: 'execution evidence' });
    if (!(await fs.lstat(resolved)).isFile()) throw new Error(`Execution evidence must be a regular file: ${relative}`);
    records.push({ path: relative, sha256: await hashFile(resolved), modifiedAt: (await fs.stat(resolved)).mtimeMs });
  }
  return records;
}

export async function beginExecutionProvenance(cwd, config, { force = false, now = Date.now() } = {}) {
  const settings = policy(config);
  const manifestPath = resolveRepoPath(cwd, settings.manifestPath, { label: 'execution provenance' });
  if (!force && (await pathExists(manifestPath)))
    throw new Error('Execution provenance already exists; use --force to replace it.');
  if (patterns(config).length === 0) throw new Error('Configure execution resultsPaths before recording provenance.');
  const record = {
    schemaVersion: 1,
    status: 'running',
    commit: head(cwd),
    cleanAtStart: cleanTree(cwd, config, settings.manifestPath),
    configSha256: await hashFile(resolveRepoPath(cwd, CONFIG_PATH)),
    environment: settings.environment,
    startedAt: new Date(now).toISOString(),
    completedAt: null,
    commands: [],
    artifacts: []
  };
  // Invalidate previous evidence before running commands, including if the process is interrupted.
  await writeFileSafe(manifestPath, `${JSON.stringify(record, null, 2)}\n`, { force });
  return { record, manifestPath };
}

export async function finishExecutionProvenance(cwd, config, pending, result, { now = Date.now() } = {}) {
  const errors = [];
  const record = { ...pending.record, completedAt: new Date(now).toISOString() };
  record.commands = (result.results || []).map(({ id, status }) => ({ id, status }));
  try {
    record.artifacts = await artifacts(cwd, config);
    if (record.artifacts.some((file) => file.modifiedAt < Date.parse(record.startedAt))) {
      errors.push('Execution evidence was not refreshed by this run.');
    }
    if (head(cwd) !== record.commit) errors.push('Git HEAD changed during execution.');
    if ((await hashFile(resolveRepoPath(cwd, CONFIG_PATH))) !== record.configSha256)
      errors.push('QA configuration changed during execution.');
    record.cleanAtEnd = cleanTree(cwd, config, policy(config).manifestPath);
    if (!record.cleanAtStart || !record.cleanAtEnd)
      errors.push('Execution provenance requires a clean source working tree.');
  } catch (error) {
    errors.push(error.message);
  }
  if (!passingCommands(record.commands, config))
    errors.push('Execution provenance must include all required passing commands.');
  record.status = result.ok && errors.length === 0 ? 'passed' : 'failed';
  await writeFileSafe(pending.manifestPath, `${JSON.stringify(record, null, 2)}\n`, { force: true });
  return { ok: record.status === 'passed', errors, manifestPath: policy(config).manifestPath };
}

export async function validateExecutionProvenance(cwd, config, { now = Date.now() } = {}) {
  const errors = [];
  let settings;
  try {
    settings = policy(config);
    if (settings.mode === 'off') return { errors: [], warnings: [] };
    const manifestPath = resolveRepoPath(cwd, settings.manifestPath, { label: 'execution provenance' });
    const record = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (record.schemaVersion !== 1 || record.status !== 'passed')
      errors.push('Execution provenance is not a completed passing run.');
    if (record.cleanAtStart !== true || record.cleanAtEnd !== true || !cleanTree(cwd, config, settings.manifestPath))
      errors.push('Execution provenance does not describe a clean source working tree.');
    if (record.commit !== head(cwd)) errors.push('Execution provenance belongs to a different commit.');
    if (record.environment !== settings.environment)
      errors.push('Execution provenance belongs to a different environment.');
    if (record.configSha256 !== (await hashFile(resolveRepoPath(cwd, CONFIG_PATH))))
      errors.push('Execution provenance uses a different QA configuration.');
    const started = Date.parse(record.startedAt);
    const completed = Date.parse(record.completedAt);
    if (
      !Number.isFinite(started) ||
      !Number.isFinite(completed) ||
      started > completed ||
      completed > now ||
      now - completed > settings.maxAgeHours * 3600000
    ) {
      errors.push('Execution provenance timestamps are invalid, expired or in the future.');
    }
    if (!passingCommands(record.commands, config)) {
      errors.push('Execution provenance must include passing command outcomes.');
    }
    const current = await artifacts(cwd, config);
    if (
      !Array.isArray(record.artifacts) ||
      record.artifacts.length !== current.length ||
      new Set(record.artifacts.map((file) => file.path)).size !== current.length ||
      current.some(
        (file) => !record.artifacts.some((saved) => saved.path === file.path && saved.sha256 === file.sha256)
      )
    ) {
      errors.push('Execution evidence paths or hashes differ from the recorded run.');
    }
  } catch {
    errors.push('Execution provenance is missing or invalid; record a fresh run with execute --record-evidence.');
  }
  return settings?.mode === 'advisory'
    ? { errors: [], warnings: errors.map((message) => `[WARN] ${message}`) }
    : { errors, warnings: [] };
}
