import path from 'node:path';
import { listFilesRecursive, pathExists, relativeTo, resolveRepoPath } from './utils.mjs';
import { DEFAULT_FEATURE_PATH, LEGACY_ARTIFACT_ALIASES } from './artifact-paths.mjs';
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

function legacyPathForCanonical(canonicalPath) {
  for (const [legacy, canonical] of LEGACY_ARTIFACT_ALIASES.entries()) {
    if (canonical === canonicalPath) return legacy;
  }
  return '';
}

export async function resolveExistingOutputTarget(cwd, config, outputSpec, label = 'phase output') {
  const target = resolveOutputHarnessPaths(cwd, config, outputSpec, label);
  if (target.absolute && (await pathExists(target.absolute))) {
    return target;
  }
  const resolved = resolveOutputSpec(config, outputSpec);
  const legacyRelative = legacyPathForCanonical(resolved.path);
  if (legacyRelative) {
    const legacyTarget = resolveHarnessRelativePath(cwd, legacyRelative, { label });
    if (legacyTarget.absolute && (await pathExists(legacyTarget.absolute))) {
      return legacyTarget;
    }
  }
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
