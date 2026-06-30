import fs from 'node:fs/promises';
import { readText, resolveRepoPath } from './utils.mjs';

/**
 * List files for a collection validator (single --file or recursive scan).
 * @returns {Promise<{ ok: boolean, files?: string[], errors?: string[], noDuplicates?: boolean }>}
 */
export async function listCollectionFiles(cwd, { fileArg, rootPaths, notUnderRootError, fileLabel, fileFilter }) {
  if (fileArg) {
    const single = await resolveSingleCollectionFile({
      cwd,
      fileArg,
      isUnderRoot: (resolved) => rootPaths.some((root) => resolved.startsWith(root)),
      notUnderRootError,
      fileLabel
    });
    if (!single.ok) return { ok: false, errors: [single.error] };
    return { ok: true, files: [single.file], noDuplicates: true };
  }

  const { listFilesRecursive } = await import('./utils.mjs');
  const files = [];
  for (const rootPath of rootPaths) {
    files.push(...(await listFilesRecursive(rootPath, fileFilter)));
  }
  return { ok: true, files };
}

/**
 * Run validation across a file collection with shared empty-collection handling.
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateCollection({ files, allowEmpty, emptyErrors, validateFile, duplicateCheck }) {
  if (files.length === 0) {
    if (allowEmpty) return { ok: true, errors: [], warnings: [] };
    return { ok: false, errors: Array.isArray(emptyErrors) ? emptyErrors : [emptyErrors], warnings: [] };
  }

  const aggErrors = [];
  const aggWarnings = [];
  const results = [];

  for (const file of files) {
    const content = await readText(file);
    const result = await validateFile(file, content);
    results.push(result);
    const errorList = result.errors || [];
    const warningList = result.warnings || [];
    for (const error of errorList) aggErrors.push(error);
    for (const warning of warningList) aggWarnings.push(warning);
  }

  if (duplicateCheck) {
    const duplicateErrors = duplicateCheck(results);
    for (const error of duplicateErrors) aggErrors.push(error);
  }

  return { ok: aggErrors.length === 0, errors: aggErrors, warnings: aggWarnings };
}

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
