import fs from 'node:fs/promises';
import { isKarateUiFeaturePath, karateFeatureRoots, usesKarate } from './automation-framework.mjs';
import { karateDuplicateIdErrors, validateKarateFeatureContent } from './karate-validate.mjs';
import { listFilesRecursive, loadQaAiConfig, relativeTo, resolveRepoPath } from './utils.mjs';
import { resolveSingleCollectionFile } from './collection-validator.mjs';

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[], skipped?: boolean }>}
 */
export async function validateKarateFeatures(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  if (!usesKarate(configInfo.data)) {
    return { ok: true, errors: [], warnings: [], skipped: true };
  }

  const roots = options.path ? [options.path] : karateFeatureRoots(configInfo.data);
  if (roots.length === 0) {
    if (options.allowEmpty) return { ok: true, errors: [], warnings: [] };
    return {
      ok: false,
      errors: ['configure automation.api.specsPath or automation.ui.specsPath for Karate.'],
      warnings: []
    };
  }

  const files = [];
  if (options.file) {
    const absoluteRoots = roots.map((root) => resolveRepoPath(cwd, root, { label: 'Karate root' }));
    const single = await resolveSingleCollectionFile({
      cwd,
      fileArg: options.file,
      isUnderRoot: (resolved) => absoluteRoots.some((root) => resolved.startsWith(root)),
      notUnderRootError: `file "${options.file}" is not under any configured Karate roots.`,
      fileLabel: 'single Karate feature file'
    });
    if (!single.ok) return { ok: false, errors: [single.error], warnings: [] };
    files.push(single.file);
    options.noDuplicates = true;
  } else {
    for (const root of roots) {
      const rootPath = resolveRepoPath(cwd, root, { label: 'Karate feature root' });
      files.push(...(await listFilesRecursive(rootPath, (filePath) => filePath.endsWith('.feature'))));
    }
  }

  if (files.length === 0) {
    if (options.allowEmpty) return { ok: true, errors: [], warnings: [] };
    return {
      ok: false,
      errors: [`No .feature files found under: ${roots.join(', ')}`],
      warnings: []
    };
  }

  const strictRf = Boolean(options.strictRf);
  let totalErrors = 0;
  const aggErrors = [];
  const aggWarnings = [];
  const results = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const result = validateKarateFeatureContent(content, file, {
      strictRf,
      isUiPath: isKarateUiFeaturePath(file, configInfo.data)
    });
    results.push(result);
    const rel = relativeTo(cwd, file);
    if (result.errors.length > 0) {
      totalErrors += result.errors.length;
      for (const error of result.errors) aggErrors.push(`${rel}: ${error}`);
    }
    for (const warning of result.warnings) aggWarnings.push(`${rel}: ${warning}`);
  }

  if (!options.noDuplicates) {
    const duplicateErrors = karateDuplicateIdErrors(results);
    if (duplicateErrors.length > 0) {
      totalErrors += duplicateErrors.length;
      for (const error of duplicateErrors) aggErrors.push(`Duplicate identifier: ${error}`);
    }
  }

  return { ok: totalErrors === 0, errors: aggErrors, warnings: aggWarnings };
}
