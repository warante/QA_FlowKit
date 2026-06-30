import fs from 'node:fs/promises';
import { resolveRepoPath } from './utils.mjs';
import { emitJson } from './validator-cli.mjs';

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

/** Exit with JSON or text failure for a single-file resolution error. */
export function exitSingleFileFailure(result, jsonMode, { prefix = 'FAILED - ' } = {}) {
  if (jsonMode) emitJson(false, [result.error]);
  else console.log(`${prefix}${result.error}`);
  process.exit(1);
}

/**
 * Handle zero-file collection: exit on failure or emit success when allow-empty.
 * @returns {boolean} true when the caller should return early (empty handled)
 */
export function handleEmptyCollection({
  fileCount,
  allowEmpty,
  jsonMode,
  failureErrors,
  failureTextLines,
  successText
}) {
  if (fileCount > 0) return false;

  if (!allowEmpty) {
    const errors = Array.isArray(failureErrors) ? failureErrors : [failureErrors];
    if (jsonMode) emitJson(false, errors);
    else {
      for (const line of failureTextLines || errors) console.log(line);
    }
    process.exit(1);
  }

  if (jsonMode) emitJson(true);
  else if (successText) console.log(successText);
  return true;
}
