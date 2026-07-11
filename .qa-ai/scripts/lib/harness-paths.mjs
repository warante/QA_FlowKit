import path from 'node:path';
import { listFilesRecursive, pathExists, relativeTo, resolveRepoPath } from './utils.mjs';
import { DEFAULT_FEATURE_PATH } from './artifact-paths.mjs';
import { resolveContractPath, resolveOutputSpec } from './harness-contract.mjs';

export function resolveHarnessRelativePath(cwd, relativePath, { label = 'path' } = {}) {
  const text = String(relativePath || '').trim();
  if (!text) {
    return { relative: '', absolute: null };
  }
  const absolute = resolveRepoPath(cwd, text, { label });
  return {
    relative: relativeTo(cwd, absolute).replaceAll(path.sep, '/'),
    absolute
  };
}

export function resolveConfigHarnessPath(cwd, config, pathRef, fallback = '', label = 'config path') {
  const relative = resolveContractPath(config, pathRef, fallback);
  if (!relative) {
    return { relative: '', absolute: null };
  }
  return resolveHarnessRelativePath(cwd, relative, { label });
}

export async function resolveExistingOutputTarget(cwd, config, outputSpec, label = 'phase output') {
  const target = resolveOutputHarnessPaths(cwd, config, outputSpec, label);
  return target;
}

export function resolveOutputHarnessPaths(cwd, config, outputSpec, label = 'phase output') {
  const resolved = resolveOutputSpec(config, outputSpec);
  if (resolved.kind === 'featureFiles') {
    const root = resolveHarnessRelativePath(cwd, resolved.path || DEFAULT_FEATURE_PATH, {
      label: `${label} feature root`
    });
    return { kind: 'featureFiles', ...root };
  }
  if (!resolved.path) {
    return { kind: resolved.kind, relative: '', absolute: null };
  }
  const target = resolveHarnessRelativePath(cwd, resolved.path, { label });
  return { kind: resolved.kind, ...target };
}

export async function listHarnessFeatureFiles(cwd, config, outputSpec, label = 'phase output') {
  const target = resolveOutputHarnessPaths(cwd, config, outputSpec, label);
  if (!target.absolute || target.kind !== 'featureFiles') {
    return [];
  }
  if (!(await pathExists(target.absolute))) {
    return [];
  }
  return listFilesRecursive(target.absolute, (filePath) => filePath.endsWith('.feature'));
}
