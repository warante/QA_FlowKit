import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { listFilesRecursive, resolveRepoPath } from './utils.mjs';

export const MODULE_RECORD = '.qa-ai/state/install-modules.json';
export const MODULE_ADAPTERS = ['claude', 'opencode', 'codex', 'cline', 'continue', 'aider', 'goose', 'gemini'];
export const INSTALL_MODULES = ['core', 'automation-presets', ...MODULE_ADAPTERS.map((name) => `adapter-${name}`)];

export function normalizeModules(value) {
  if (value === undefined || value === null) return [...INSTALL_MODULES];
  const names = Array.isArray(value) ? value : String(value).split(',');
  const requested = names.map((name) => String(name).trim()).filter(Boolean);
  if (!requested.length) throw new Error('--modules requires a non-empty comma-separated list.');
  if (requested.includes('all')) {
    if (requested.length !== 1) throw new Error('Module all cannot be combined with other modules.');
    return [...INSTALL_MODULES];
  }
  for (const name of requested)
    if (!INSTALL_MODULES.includes(name)) throw new Error(`Unknown installation module: ${name}`);
  return INSTALL_MODULES.filter((name) => name === 'core' || requested.includes(name));
}

export function moduleOption(args) {
  let result;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg !== '--modules' && !arg.startsWith('--modules=')) continue;
    if (result !== undefined) throw new Error('Specify --modules only once.');
    const value = arg === '--modules' ? args[++index] : arg.slice('--modules='.length);
    if (!value || value.startsWith('--')) throw new Error('--modules requires a value.');
    result = normalizeModules(value);
  }
  return result;
}

/** Shared governance/runtime stays core; optional modules own only their installation assets. */
export function moduleForPath(relative) {
  const file = relative.replaceAll('\\', '/').replace(/^\.qa-ai\//, '');
  const adapter = file.split('/');
  if (adapter[0] === 'adapters' && MODULE_ADAPTERS.includes(adapter[1])) return `adapter-${adapter[1]}`;
  if (
    (file.startsWith('presets/') && file.endsWith('.yaml') && file !== 'presets/manual-only.yaml') ||
    file === 'templates/karate-config.template.js'
  )
    return 'automation-presets';
  return 'core';
}

export function modulePathSelected(relative, modules = INSTALL_MODULES) {
  return modules.includes(moduleForPath(relative));
}

export function availableModuleAdapters(modules = INSTALL_MODULES) {
  return ['generic', ...MODULE_ADAPTERS.filter((name) => modules.includes(`adapter-${name}`))];
}

function payloadPath(relative) {
  return (
    relative &&
    ![...relative].some((char) => char.charCodeAt(0) < 32) &&
    !path.isAbsolute(relative) &&
    !path.win32.isAbsolute(relative) &&
    !relative.includes('\\') &&
    !relative.includes(':') &&
    !relative.split('/').some((part) => !part || part === '.' || part === '..') &&
    !['state', 'output', 'features', 'tests', 'config-profiles'].includes(relative.split('/')[0]) &&
    !['qa-ai.config.yaml', 'agents/specialists/active.md'].includes(relative)
  );
}

async function safeTarget(cwd, relative) {
  const absolute = resolveRepoPath(cwd, relative, { label: 'module installation path' });
  let current = absolute;
  while (current !== path.resolve(cwd)) {
    try {
      if ((await fs.lstat(current)).isSymbolicLink())
        throw new Error('Module installation refuses symbolic links or junctions.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    current = path.dirname(current);
  }
  return absolute;
}

export async function readModuleInstallation(cwd) {
  const target = path.join(cwd, MODULE_RECORD);
  let stat;
  try {
    stat = await fs.lstat(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  await safeTarget(cwd, MODULE_RECORD);
  if (!stat.isFile() || stat.size > 5 * 1024 * 1024) throw new Error('Invalid module installation record.');
  const record = JSON.parse(await fs.readFile(target, 'utf8'));
  if (
    !record ||
    record.version !== 1 ||
    Object.keys(record).some((key) => !['version', 'modules', 'files'].includes(key)) ||
    !Array.isArray(record.modules) ||
    !record.modules.includes('core') ||
    record.modules.some((name) => !INSTALL_MODULES.includes(name)) ||
    new Set(record.modules).size !== record.modules.length ||
    !record.files ||
    typeof record.files !== 'object' ||
    Array.isArray(record.files) ||
    !Object.keys(record.files).length ||
    Object.entries(record.files).some(
      ([file, hash]) =>
        !payloadPath(file) ||
        !modulePathSelected(file, record.modules) ||
        typeof hash !== 'string' ||
        !/^[a-f0-9]{64}$/.test(hash)
    )
  ) {
    throw new Error('Invalid module installation record; refusing to infer a partial installation.');
  }
  return record;
}

export function expandedModules(installed, requested) {
  const current = installed?.modules || INSTALL_MODULES;
  return requested
    ? INSTALL_MODULES.filter((name) => current.includes(name) || requested.includes(name))
    : [...current];
}

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Add/refresh selected payloads without deleting unowned files. Preflight every collision before writing. */
export async function copyModuleInstallation(sourceFramework, cwd, modules, { force = false, installed = null } = {}) {
  const selection = normalizeModules(modules);
  const sourceFiles = await listFilesRecursive(sourceFramework);
  const entries = [];
  for (const source of sourceFiles) {
    const relative = path.relative(sourceFramework, source).replaceAll('\\', '/');
    if (!payloadPath(relative) || !modulePathSelected(relative, selection)) continue;
    const target = await safeTarget(cwd, `.qa-ai/${relative}`);
    const content = await fs.readFile(source);
    const sha256 = digest(content);
    try {
      const existing = digest(await fs.readFile(target));
      if (!force && existing !== sha256 && installed?.files[relative] !== existing) {
        throw new Error(`Local file would be overwritten: .qa-ai/${relative}. Review it or use --force explicitly.`);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    entries.push({ relative, target, content, sha256 });
  }
  if (!entries.some((entry) => entry.relative === 'scripts/init.mjs'))
    throw new Error('Packaged core module is incomplete.');
  for (const module of selection.filter((name) => name !== 'core')) {
    if (!entries.some((entry) => moduleForPath(entry.relative) === module))
      throw new Error(`Packaged module is missing: ${module}`);
  }
  const recordPath = await safeTarget(cwd, MODULE_RECORD);
  if (!installed && !force) {
    let exists = false;
    try {
      await fs.access(recordPath);
      exists = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (exists) throw new Error('Module installation record already exists. Use update or explicitly approve --force.');
  }
  const record = {
    version: 1,
    modules: selection,
    files: Object.fromEntries(entries.map((entry) => [entry.relative, entry.sha256]))
  };
  for (const entry of entries) {
    await fs.mkdir(path.dirname(entry.target), { recursive: true });
    await safeTarget(cwd, `.qa-ai/${entry.relative}`);
    await fs.writeFile(entry.target, entry.content);
  }
  await fs.mkdir(path.dirname(recordPath), { recursive: true });
  await safeTarget(cwd, MODULE_RECORD);
  await fs.writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

export async function assertModuleAdapters(cwd, names) {
  const record = await readModuleInstallation(cwd);
  if (!record) return;
  const available = availableModuleAdapters(record.modules);
  for (const name of names) {
    if (!available.includes(name))
      throw new Error(`Adapter ${name} is not installed. Add it with qa-flowkit update --modules adapter-${name}.`);
  }
}
