import fs from 'node:fs/promises';
import { resolveRepoPath } from './utils.mjs';

/**
 * Resolve and validate a single --file argument under one or more allowed roots.
 * @returns {{ ok: true, file: string } | { ok: false, error: string }}
 */
export async function resolveSingleCollectionFile({
  cwd,
  fileArg,
  isUnderRoot,
  notUnderRootError,
  fileLabel = 'single file'
}) {
  const resolvedFile = resolveRepoPath(cwd, fileArg, { label: fileLabel });
  if (!isUnderRoot(resolvedFile)) {
    return { ok: false, error: notUnderRootError };
  }
  try {
    const stat = await fs.stat(resolvedFile);
    if (!stat.isFile()) {
      return { ok: false, error: `file "${fileArg}" is not a file.` };
    }
  } catch {
    return { ok: false, error: `file "${fileArg}" does not exist.` };
  }
  return { ok: true, file: resolvedFile };
}

/** Signal a single-file resolution failure (CLI should format and exit). */
export function exitSingleFileFailure(result, jsonMode, { prefix = 'FAILED - ' } = {}) {
  const error = new Error(result.error);
  error.jsonMode = jsonMode;
  error.prefix = prefix;
  error.validatorCliFailure = true;
  throw error;
}

/**
 * Handle zero-file collection.
 * @returns {boolean} true when the caller should return early (empty handled)
 */
export function handleEmptyCollection({
  fileCount,
  allowEmpty,
  jsonMode,
  failureErrors,
  failureTextLines,
  successText: _successText
}) {
  if (fileCount > 0) return false;

  if (!allowEmpty) {
    const errors = Array.isArray(failureErrors) ? failureErrors : [failureErrors];
    const error = new Error(errors[0] || 'No files found.');
    error.jsonMode = jsonMode;
    error.failureTextLines = failureTextLines || errors;
    error.validatorCliFailure = true;
    throw error;
  }

  return true;
}
