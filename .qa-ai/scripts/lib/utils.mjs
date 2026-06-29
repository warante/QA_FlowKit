import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseYaml, stripInlineComment } from './yaml.mjs';
import {
  ARTIFACT_PATHS,
  DEFAULT_TEST_MANAGEMENT_SYNC_PLAN_PATH,
  LEGACY_ARTIFACT_ALIASES,
  QA_OUTPUT_DIR
} from './artifact-paths.mjs';

export { ARTIFACT_PATHS, DEFAULT_TEST_MANAGEMENT_SYNC_PLAN_PATH, LEGACY_ARTIFACT_ALIASES, QA_OUTPUT_DIR };

export const manifestRelativePath = '.qa-ai/state/init-manifest.json';

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  const created = await fs.mkdir(dirPath, { recursive: true });
  return { type: 'dir', created: Boolean(created), path: dirPath };
}

export async function writeFileSafe(filePath, content, { force = false } = {}) {
  if (!force && (await pathExists(filePath))) {
    return { type: 'file', written: false, reason: 'exists', path: filePath };
  }
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf8');
  return { type: 'file', written: true, path: filePath };
}

export async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

export async function readTextIfExists(filePath) {
  if (!(await pathExists(filePath))) return null;
  return readText(filePath);
}

export async function copyFileSafe(source, target, { force = false } = {}) {
  if (!force && (await pathExists(target))) {
    return { type: 'file', copied: false, reason: 'exists', path: target };
  }
  await ensureDir(path.dirname(target));
  await fs.copyFile(source, target);
  return { type: 'file', copied: true, path: target };
}

export async function copyDirSafe(sourceDir, targetDir, { force = false } = {}) {
  if (!(await pathExists(sourceDir))) return [];
  const results = [];
  const dirResult = await ensureDir(targetDir);
  if (dirResult.created) results.push(dirResult);
  const items = await fs.readdir(sourceDir, { withFileTypes: true });
  items.sort((a, b) => a.name.localeCompare(b.name));
  for (const item of items) {
    const source = path.join(sourceDir, item.name);
    const target = path.join(targetDir, item.name);
    if (item.isDirectory()) {
      results.push(...(await copyDirSafe(source, target, { force })));
    } else if (item.isFile()) {
      results.push(await copyFileSafe(source, target, { force }));
    }
  }
  return results;
}

export async function listFilesRecursive(dirPath, predicate = () => true) {
  if (!(await pathExists(dirPath))) return [];
  const files = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  items.sort((a, b) => a.name.localeCompare(b.name));
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath, predicate)));
    } else if (item.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

export function logHeader(title) {
  console.log(`\n=== ${title} ===\n`);
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item) continue;
    if (!item.startsWith('--')) {
      args._.push(item);
      continue;
    }

    const equalsIndex = item.indexOf('=');
    let key;
    let value;
    if (equalsIndex > -1) {
      key = item.slice(2, equalsIndex);
      value = item.slice(equalsIndex + 1);
    } else {
      key = item.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        value = true;
      } else {
        value = next;
        i += 1;
      }
    }

    if (Object.hasOwn(args, key)) {
      args[key] = Array.isArray(args[key]) ? [...args[key], value] : [args[key], value];
    } else {
      args[key] = value;
    }
  }
  return args;
}

export function commaList(value) {
  if (value === undefined || value === null || value === false) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}

export function relativeTo(cwd, filePath) {
  return path.relative(cwd, filePath).replaceAll(path.sep, '/');
}

export function toPosixPath(filePath) {
  return filePath.replaceAll(path.sep, '/');
}

export function resolveInsideCwd(cwd, relativePath) {
  const root = path.resolve(cwd);
  const resolved = path.resolve(cwd, relativePath);
  const inside = resolved === root || resolved.startsWith(`${root}${path.sep}`);
  return { resolved, inside };
}

export function resolveRepoPath(cwd, relativePath, { label = 'path', allowRoot = false } = {}) {
  const value = String(relativePath || '').trim();
  if (!value) {
    throw new Error(`Invalid ${label}: path is empty.`);
  }
  if (path.isAbsolute(value)) {
    throw new Error(`Invalid ${label}: absolute paths are not allowed (${value}).`);
  }

  const root = path.resolve(cwd);
  const target = resolveInsideCwd(cwd, value);
  if (!target.inside || (!allowRoot && target.resolved === root)) {
    throw new Error(`Invalid ${label}: path must stay inside the repository (${value}).`);
  }

  try {
    const realRoot = fsSync.realpathSync.native(root);
    const realTarget = fsSync.realpathSync.native(target.resolved);
    const realInside = realTarget === realRoot || realTarget.startsWith(`${realRoot}${path.sep}`);
    if (!realInside || (!allowRoot && realTarget === realRoot)) {
      throw new Error(`Invalid ${label}: path must stay inside the repository (${value}).`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  return target.resolved;
}

export async function resolveTestManagementSyncPlanPath(cwd, config, { preferExisting = true } = {}) {
  const configuredPath = getConfigValue(
    config,
    'testManagement.syncPlanPath',
    getConfigValue(config, 'testrail.syncPlanPath', DEFAULT_TEST_MANAGEMENT_SYNC_PLAN_PATH)
  );
  const absPath = resolveRepoPath(cwd, configuredPath, { label: 'sync plan' });
  const legacyPath = [...LEGACY_ARTIFACT_ALIASES.keys()].find((candidate) => candidate.includes('sync-plan')) || null;
  const legacyAbsPath = legacyPath ? resolveRepoPath(cwd, legacyPath, { label: 'legacy sync plan' }) : null;

  if (preferExisting && !(await pathExists(absPath)) && legacyAbsPath && (await pathExists(legacyAbsPath))) {
    return {
      path: legacyPath,
      absPath: legacyAbsPath,
      isLegacy: true,
      replacementPath: LEGACY_ARTIFACT_ALIASES.get(legacyPath) || configuredPath,
      legacyPath,
      legacyAbsPath
    };
  }

  return {
    path: configuredPath,
    absPath,
    isLegacy: false,
    replacementPath: null,
    legacyPath,
    legacyAbsPath
  };
}

export async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function yamlScalar(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_. -]+$/.test(text) && text.trim() === text) return text;
  return JSON.stringify(text);
}

export function parseSimpleYaml(content, filename = 'inline') {
  return parseYaml(content, filename);
}

export function getConfigValue(config, keyPath, fallback = undefined) {
  const parts = Array.isArray(keyPath) ? keyPath : String(keyPath).split('.');
  let current = config;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return fallback;
    current = current[part];
  }
  return current === undefined || current === null ? fallback : current;
}

export function legacyInferredAcceptanceCriteria(requirements = {}) {
  if (!requirements || typeof requirements !== 'object') return undefined;
  if (requirements.allowInferredAcceptanceCriteria === false) return 'forbid';
  if (requirements.allowInferredAcceptanceCriteria !== true) return undefined;
  return requirements.requireApprovalForInferredCriteria === false ? 'allow' : 'require-approval';
}

export function normalizeRequirementsConfig(config) {
  if (!config || typeof config !== 'object') return config;
  const requirements = config.requirements;
  if (!requirements || typeof requirements !== 'object') return config;
  const legacyValue = legacyInferredAcceptanceCriteria(requirements);
  if (!requirements.inferredAcceptanceCriteria && legacyValue) {
    requirements.inferredAcceptanceCriteria = legacyValue;
  }
  return config;
}

export function inferredAcceptanceCriteriaConflicts(config) {
  const requirements = config?.requirements;
  const legacyValue = legacyInferredAcceptanceCriteria(requirements);
  const configuredValue = requirements?.inferredAcceptanceCriteria;
  if (!legacyValue || !configuredValue || legacyValue === configuredValue) return [];
  return [
    [
      'requirements.inferredAcceptanceCriteria',
      'requirements.allowInferredAcceptanceCriteria',
      'requirements.requireApprovalForInferredCriteria'
    ].join(', ')
  ];
}

export async function loadQaAiConfig(cwd, { useCache = true } = {}) {
  const cacheKey = path.resolve(cwd);
  if (useCache && loadQaAiConfig.cache.has(cacheKey)) {
    return loadQaAiConfig.cache.get(cacheKey);
  }
  const filePath = path.join(cwd, 'qa-ai.config.yaml');
  if (!(await pathExists(filePath))) {
    const result = { exists: false, path: filePath, content: '', data: {} };
    if (useCache) loadQaAiConfig.cache.set(cacheKey, result);
    return result;
  }
  const content = await readText(filePath);
  const result = { exists: true, path: filePath, content, data: normalizeRequirementsConfig(parseSimpleYaml(content)) };
  if (useCache) loadQaAiConfig.cache.set(cacheKey, result);
  return result;
}

loadQaAiConfig.cache = new Map();

export function clearQaAiConfigCache(cwd) {
  if (cwd) loadQaAiConfig.cache.delete(path.resolve(cwd));
  else loadQaAiConfig.cache.clear();
}

export function findChangeMeKeys(content) {
  const findings = [];
  const stack = [];
  for (const line of String(content || '')
    .replace(/\r/g, '')
    .split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^(\s*)([^:\s][^:]*):\s*(.*)$/);
    if (!match) continue;
    const indent = match[1].length;
    const key = match[2].trim();
    const value = stripInlineComment(match[3].trim());
    while (stack.length > 0 && stack.at(-1).indent >= indent) stack.pop();
    const pathParts = [...stack.map((item) => item.key), key];
    if (value === 'CHANGE_ME' || value === '"CHANGE_ME"' || value === "'CHANGE_ME'") {
      findings.push(pathParts.join('.'));
    }
    if (value === '') stack.push({ indent, key });
  }
  return findings;
}

export function manifestPath(cwd) {
  return path.join(cwd, manifestRelativePath);
}

export async function loadInitManifest(cwd) {
  const filePath = manifestPath(cwd);
  if (!(await pathExists(filePath))) {
    return {
      exists: false,
      path: filePath,
      data: {
        version: 1,
        entries: []
      }
    };
  }

  const content = await readText(filePath);
  const data = JSON.parse(content);
  return {
    exists: true,
    path: filePath,
    data: {
      version: 1,
      ...data,
      entries: Array.isArray(data.entries) ? data.entries : []
    }
  };
}

export async function saveInitManifest(cwd, manifest) {
  const filePath = manifestPath(cwd);
  const now = new Date().toISOString();
  const normalized = {
    version: 1,
    createdAt: manifest.createdAt || now,
    updatedAt: now,
    entries: [...manifest.entries].sort((a, b) => a.path.localeCompare(b.path))
  };
  await writeFileSafe(filePath, `${JSON.stringify(normalized, null, 2)}\n`, { force: true });
  return normalized;
}

export async function manifestEntry(cwd, filePath, { type, category, source }) {
  const relPath = toPosixPath(path.relative(cwd, filePath));
  const entry = {
    path: relPath,
    type,
    category,
    source
  };
  if (type === 'file') entry.sha256 = await hashFile(filePath);
  return entry;
}

export async function recordManifestEntries(cwd, entries) {
  const filtered = entries.filter(Boolean);
  if (filtered.length === 0) return null;

  const { data } = await loadInitManifest(cwd);
  const now = new Date().toISOString();
  const byKey = new Map(data.entries.map((entry) => [`${entry.type}:${entry.path}`, entry]));

  for (const entry of filtered) {
    const key = `${entry.type}:${entry.path}`;
    const previous = byKey.get(key);
    byKey.set(key, {
      ...previous,
      ...entry,
      createdAt: previous?.createdAt || now,
      updatedAt: now
    });
  }

  return saveInitManifest(cwd, {
    ...data,
    entries: [...byKey.values()]
  });
}

// Lax ISO-8601 check: parses as a Date and requires a date-time form (must include "T").
// Accepts offsets and "Z". Use for fields where a timezone offset is acceptable.
export function isIsoDateString(value) {
  const str = String(value || '');
  if (!str.includes('T')) return false;
  return !Number.isNaN(new Date(str).getTime());
}

// Strict ISO-8601 UTC check: requires the canonical YYYY-MM-DDTHH:MM:SS(.sss)Z form.
// Use for artifacts that must record UTC timestamps (e.g. external intake "Imported at").
export function isIsoUtcDateString(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(String(value || '').trim());
}
