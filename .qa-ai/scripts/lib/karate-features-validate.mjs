import { isKarateUiFeaturePath, karateFeatureRoots, usesKarate } from './automation-framework.mjs';
import { karateDuplicateIdErrors, validateKarateFeatureContent } from './karate-validate.mjs';
import { loadQaAiConfig, relativeTo, resolveRepoPath } from './utils.mjs';
import { listCollectionFiles, validateCollection } from './collection-validator.mjs';

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

  const rootPaths = roots.map((root) => resolveRepoPath(cwd, root, { label: 'Karate feature root' }));
  const listed = await listCollectionFiles(cwd, {
    fileArg: options.file,
    rootPaths,
    notUnderRootError: `file "${options.file}" is not under any configured Karate roots.`,
    fileLabel: 'single Karate feature file',
    fileFilter: (filePath) => filePath.endsWith('.feature')
  });
  if (!listed.ok) return { ok: false, errors: listed.errors, warnings: [] };

  const noDuplicates = Boolean(options.noDuplicates || options.file);
  const strictRf = Boolean(options.strictRf);

  return validateCollection({
    files: listed.files,
    allowEmpty: Boolean(options.allowEmpty),
    emptyErrors: [`No .feature files found under: ${roots.join(', ')}`],
    validateFile: async (file, content) => {
      const parsed = validateKarateFeatureContent(content, file, {
        strictRf,
        isUiPath: isKarateUiFeaturePath(file, configInfo.data)
      });
      const rel = relativeTo(cwd, file);
      return {
        errors: parsed.errors.map((error) => `${rel}: ${error}`),
        warnings: parsed.warnings.map((warning) => `${rel}: ${warning}`),
        parsed
      };
    },
    duplicateCheck: noDuplicates
      ? null
      : (items) =>
          karateDuplicateIdErrors(items.map((item) => item.parsed)).map((error) => `Duplicate identifier: ${error}`)
  });
}
