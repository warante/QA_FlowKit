import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

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
  if (!force && await pathExists(filePath)) {
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
  if (!await pathExists(filePath)) return null;
  return readText(filePath);
}

export async function copyFileSafe(source, target, { force = false } = {}) {
  if (!force && await pathExists(target)) {
    return { type: 'file', copied: false, reason: 'exists', path: target };
  }
  await ensureDir(path.dirname(target));
  await fs.copyFile(source, target);
  return { type: 'file', copied: true, path: target };
}

export async function copyDirSafe(sourceDir, targetDir, { force = false } = {}) {
  if (!await pathExists(sourceDir)) return [];
  const results = [];
  const dirResult = await ensureDir(targetDir);
  if (dirResult.created) results.push(dirResult);
  const items = await fs.readdir(sourceDir, { withFileTypes: true });
  items.sort((a, b) => a.name.localeCompare(b.name));
  for (const item of items) {
    const source = path.join(sourceDir, item.name);
    const target = path.join(targetDir, item.name);
    if (item.isDirectory()) {
      results.push(...await copyDirSafe(source, target, { force }));
    } else if (item.isFile()) {
      results.push(await copyFileSafe(source, target, { force }));
    }
  }
  return results;
}

export async function listFilesRecursive(dirPath, predicate = () => true) {
  if (!await pathExists(dirPath)) return [];
  const files = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  items.sort((a, b) => a.name.localeCompare(b.name));
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      files.push(...await listFilesRecursive(fullPath, predicate));
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

export async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function yamlScalar(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_. -]+$/.test(text) && text.trim() === text) return text;
  return JSON.stringify(text);
}

function parseScalar(value) {
  const text = value.trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (text === 'null' || text === '~') return null;
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function yamlLines(content) {
  return content
    .replace(/\r/g, '')
    .split('\n')
    .map((raw) => ({
      indent: raw.match(/^ */)?.[0].length ?? 0,
      text: raw.trim()
    }))
    .filter((line) => line.text && !line.text.startsWith('#'));
}

export function parseSimpleYaml(content) {
  const lines = yamlLines(content);
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    while (stack.length > 1 && stack.at(-1).indent >= line.indent) stack.pop();
    const parent = stack.at(-1).value;

    if (line.text.startsWith('- ')) {
      if (Array.isArray(parent)) parent.push(parseScalar(line.text.slice(2)));
      continue;
    }

    const colonIndex = line.text.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.text.slice(0, colonIndex).trim();
    const rest = line.text.slice(colonIndex + 1).trim();
    if (!key || Array.isArray(parent)) continue;

    if (rest) {
      parent[key] = parseScalar(rest);
      continue;
    }

    const next = lines[i + 1];
    const child = next && next.indent > line.indent && next.text.startsWith('- ') ? [] : {};
    parent[key] = child;
    stack.push({ indent: line.indent, value: child });
  }

  return root;
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

export async function loadQaAiConfig(cwd) {
  const filePath = path.join(cwd, 'qa-ai.config.yaml');
  if (!await pathExists(filePath)) {
    return { exists: false, path: filePath, content: '', data: {} };
  }
  const content = await readText(filePath);
  return { exists: true, path: filePath, content, data: parseSimpleYaml(content) };
}

export function manifestPath(cwd) {
  return path.join(cwd, manifestRelativePath);
}

export async function loadInitManifest(cwd) {
  const filePath = manifestPath(cwd);
  if (!await pathExists(filePath)) {
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
