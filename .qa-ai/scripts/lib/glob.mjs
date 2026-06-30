import path from 'node:path';
import { listFilesRecursive, pathExists, resolveRepoPath, toPosixPath } from './utils.mjs';

/** Convert a glob pattern to a case-insensitive RegExp anchored to the full path. */
export function globToRegex(globPattern) {
  let normalized = globPattern.replaceAll('\\', '/');

  normalized = normalized.replaceAll('**/', '__DOUBLE_STAR_SLASH__');
  normalized = normalized.replaceAll('**', '__DOUBLE_STAR__');
  normalized = normalized.replaceAll('*', '__STAR__');
  normalized = normalized.replaceAll('?', '__QUESTION__');

  let regexStr = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  regexStr = regexStr.replaceAll('__DOUBLE_STAR_SLASH__', '(?:.*/)?');
  regexStr = regexStr.replaceAll('__DOUBLE_STAR__', '.*');
  regexStr = regexStr.replaceAll('__STAR__', '[^/]*');
  regexStr = regexStr.replaceAll('__QUESTION__', '[^/]');

  return new RegExp(`^${regexStr}$`, 'i');
}

/** Resolve glob patterns to absolute file paths without external dependencies. */
export async function resolveGlobs(cwd, globs) {
  const matchedFiles = new Set();

  for (const pattern of globs) {
    const trimmed = pattern.trim();
    if (!trimmed) continue;

    if (!trimmed.includes('*') && !trimmed.includes('?')) {
      try {
        const absPath = resolveRepoPath(cwd, trimmed, { label: 'glob resolution' });
        if (await pathExists(absPath)) {
          matchedFiles.add(path.resolve(absPath));
        }
      } catch {
        // Ignore resolution errors
      }
      continue;
    }

    const firstWildcard = trimmed.search(/[*?]/);
    const staticPart = trimmed.slice(0, firstWildcard);
    const lastSlash = staticPart.lastIndexOf('/');
    const lastBackslash = staticPart.lastIndexOf('\\');
    const splitIndex = Math.max(lastSlash, lastBackslash);

    let scanDir = '.';
    if (splitIndex > -1) {
      scanDir = staticPart.slice(0, splitIndex);
    }

    let absScanDir;
    try {
      absScanDir = resolveRepoPath(cwd, scanDir || '.', { label: 'glob scan dir', allowRoot: true });
    } catch {
      continue;
    }

    if (!(await pathExists(absScanDir))) continue;

    const regex = globToRegex(trimmed);
    const allFiles = await listFilesRecursive(absScanDir);

    for (const file of allFiles) {
      const relPath = toPosixPath(path.relative(cwd, file));
      if (regex.test(relPath)) {
        matchedFiles.add(path.resolve(file));
      }
    }
  }

  return Array.from(matchedFiles);
}
