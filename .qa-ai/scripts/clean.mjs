#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  hashFile,
  loadInitManifest,
  manifestRelativePath,
  parseArgs,
  pathExists,
  resolveInsideCwd,
  saveInitManifest,
  logHeader
} from './lib/utils.mjs';

const cwd = process.cwd();
const args = parseArgs(process.argv);
const force = Boolean(args.force);
const includeModified = Boolean(args['include-modified']);
const pruneState = Boolean(args['prune-state']);

function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/clean.mjs [options]

Default behavior is a dry-run. Nothing is deleted unless --force is passed.

Options:
  --generated         Include generated non-adapter files and directories from init
  --adapters          Include generated adapter files and adapter directories
  --empty-dirs        Include tracked empty directories
  --all               Include all tracked entries (default when no category is passed)
  --force             Execute the cleanup plan
  --include-modified  Also delete tracked files whose content changed since init
  --prune-state       Remove .qa-ai/state/init-manifest.json when no entries remain
  --help              Show this help

Examples:
  node .qa-ai/scripts/clean.mjs
  node .qa-ai/scripts/clean.mjs --generated --force
  node .qa-ai/scripts/clean.mjs --adapters --empty-dirs --force
`);
}

function entryKey(entry) {
  return `${entry.type}:${entry.path}`;
}

function selectedCategories() {
  const explicit = Boolean(args.generated || args.adapters || args['empty-dirs'] || args.all);
  return {
    all: Boolean(args.all || !explicit),
    generated: Boolean(args.generated),
    adapters: Boolean(args.adapters),
    emptyDirs: Boolean(args['empty-dirs'])
  };
}

function shouldSelect(entry, categories) {
  if (categories.all) return true;
  if (entry.type === 'dir') {
    if (categories.emptyDirs) return true;
    if (categories.generated && entry.category === 'generated') return true;
    if (categories.adapters && entry.category === 'adapter') return true;
    return false;
  }
  if (categories.generated && entry.category === 'generated') return true;
  if (categories.adapters && entry.category === 'adapter') return true;
  return false;
}

function safeTarget(entry) {
  if (!entry.path || path.isAbsolute(entry.path) || entry.path === '.') {
    return { ok: false, reason: 'unsafe manifest path' };
  }
  if (entry.path === manifestRelativePath) {
    return { ok: false, reason: 'manifest state is handled separately' };
  }

  const target = resolveInsideCwd(cwd, entry.path);
  if (!target.inside || target.resolved === path.resolve(cwd)) {
    return { ok: false, reason: 'path resolves outside repository root' };
  }
  return { ok: true, path: target.resolved };
}

async function planFile(entry) {
  const target = safeTarget(entry);
  if (!target.ok) return { entry, action: 'skip', reason: target.reason };
  if (!await pathExists(target.path)) return { entry, action: 'missing', removeFromManifest: true };

  const stat = await fs.lstat(target.path);
  if (!stat.isFile()) return { entry, action: 'skip', reason: 'not a regular file' };

  if (entry.sha256) {
    const currentHash = await hashFile(target.path);
    if (currentHash !== entry.sha256 && !includeModified) {
      return { entry, action: 'skip', reason: 'modified since init' };
    }
  }

  return {
    entry,
    action: force ? 'delete-file' : 'would-delete-file',
    target: target.path,
    removeFromManifest: force
  };
}

async function planDirectory(entry, removalPaths) {
  const target = safeTarget(entry);
  if (!target.ok) return { entry, action: 'skip', reason: target.reason };
  if (!await pathExists(target.path)) return { entry, action: 'missing', removeFromManifest: true };

  const stat = await fs.lstat(target.path);
  if (!stat.isDirectory()) return { entry, action: 'skip', reason: 'not a directory' };

  const children = await fs.readdir(target.path);
  const removableAfterTrackedChildren = children.every((child) => {
    const childPath = `${entry.path.replace(/\/$/, '')}/${child}`;
    return removalPaths.has(childPath);
  });
  if (children.length > 0 && !removableAfterTrackedChildren) {
    return { entry, action: 'skip', reason: 'directory is not empty' };
  }

  return {
    entry,
    action: force ? 'remove-dir' : 'would-remove-dir',
    target: target.path,
    removeFromManifest: force
  };
}

async function planEntries(entries) {
  const files = entries.filter((entry) => entry.type === 'file');
  const dirs = entries
    .filter((entry) => entry.type === 'dir')
    .sort((a, b) => b.path.length - a.path.length);
  const planned = [];
  const removalPaths = new Set();

  for (const entry of files) {
    const item = await planFile(entry);
    planned.push(item);
    if (item.removeFromManifest || item.action === 'would-delete-file') removalPaths.add(entry.path);
  }
  for (const entry of dirs) {
    const item = await planDirectory(entry, removalPaths);
    planned.push(item);
    if (item.removeFromManifest || item.action === 'would-remove-dir') removalPaths.add(entry.path);
  }

  return planned;
}

async function executePlan(plan) {
  for (const item of plan) {
    if (item.action === 'delete-file') await fs.rm(item.target, { force: false });
    if (item.action === 'remove-dir') await fs.rmdir(item.target);
  }
}

function printPlan(plan) {
  for (const item of plan) {
    const label = item.action.toUpperCase().replaceAll('-', ' ');
    const suffix = item.reason ? ` (${item.reason})` : '';
    console.log(`[${label}] ${item.entry.path}${suffix}`);
  }
}

function summarize(plan) {
  const counts = new Map();
  for (const item of plan) counts.set(item.action, (counts.get(item.action) || 0) + 1);
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([action, count]) => `${action}: ${count}`)
    .join(', ');
}

async function pruneManifestState(manifestPath) {
  if (!pruneState) return;
  await fs.rm(manifestPath, { force: true });
  try {
    await fs.rmdir(path.dirname(manifestPath));
  } catch {
    // Keep the state directory when other files are present.
  }
}

async function main() {
  if (args.help) {
    printHelp();
    return;
  }

  logHeader('QA AI Starter clean');
  const { exists, path: manifestPath, data: manifest } = await loadInitManifest(cwd);
  if (!exists) {
    console.log(`No init manifest found at ${manifestRelativePath}. Run init before clean can safely remove generated files.`);
    return;
  }

  const categories = selectedCategories();
  const selected = manifest.entries.filter((entry) => shouldSelect(entry, categories));
  if (selected.length === 0) {
    console.log('No matching manifest entries for the selected cleanup options.');
    return;
  }

  console.log(force ? 'Mode: execute cleanup' : 'Mode: dry-run only');
  if (includeModified) console.log('Modified tracked files are included because --include-modified was passed.');
  console.log('');

  const plan = await planEntries(selected);
  printPlan(plan);
  console.log(`\nSummary: ${summarize(plan) || 'nothing to do'}`);

  if (!force) {
    console.log('\nNo files were deleted. Re-run with --force to execute this plan.');
    return;
  }

  await executePlan(plan);

  const removeKeys = new Set(plan.filter((item) => item.removeFromManifest).map((item) => entryKey(item.entry)));
  const remainingEntries = manifest.entries.filter((entry) => !removeKeys.has(entryKey(entry)));

  if (remainingEntries.length === 0 && pruneState) {
    await pruneManifestState(manifestPath);
    console.log(`\nRemoved ${manifestRelativePath}.`);
    return;
  }

  await saveInitManifest(cwd, {
    ...manifest,
    entries: remainingEntries
  });
  console.log(`\nUpdated ${manifestRelativePath}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
