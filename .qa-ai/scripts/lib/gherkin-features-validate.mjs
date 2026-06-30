import fs from 'node:fs/promises';
import { validateFeatureFilePlacement } from './feature-layout.mjs';
import { duplicateIdErrors, normalizeLanguage, validateFeatureContent } from './gherkin-validate.mjs';
import { getConfigValue, listFilesRecursive, loadQaAiConfig, relativeTo, resolveRepoPath } from './utils.mjs';
import { resolveSingleCollectionFile } from './collection-validator.mjs';

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateDesignFeatures(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = options.path || getConfigValue(configInfo.data, 'gherkin.featurePath', 'features');
  const language = normalizeLanguage(
    options.gherkinLanguage || getConfigValue(configInfo.data, 'gherkin.language', 'en')
  );
  const requiredTags = getConfigValue(configInfo.data, 'gherkin.tags.required', ['priority', 'type', 'manual']);
  const tagNames =
    Array.isArray(requiredTags) && requiredTags.length > 0 ? requiredTags : ['priority', 'type', 'manual'];
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const strictTags = Boolean(options.strictTags);
  const strictLayout = Boolean(options.strictLayout);
  const aiTestingConfig = {
    enabled: Boolean(getConfigValue(configInfo.data, 'aiTesting.enabled', false)),
    requiredTechniques: getConfigValue(configInfo.data, 'aiTesting.requiredTechniques', []),
    optionalTechniques: getConfigValue(configInfo.data, 'aiTesting.optionalTechniques', [])
  };

  let files;
  if (options.file) {
    const single = await resolveSingleCollectionFile({
      cwd,
      fileArg: options.file,
      isUnderRoot: (resolved) => resolved.startsWith(featureRootPath),
      notUnderRootError: `file "${options.file}" is not under feature root "${featureRoot}".`,
      fileLabel: 'single feature file'
    });
    if (!single.ok) return { ok: false, errors: [single.error], warnings: [] };
    files = [single.file];
    options.noDuplicates = true;
  } else {
    files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  }

  if (files.length === 0) {
    if (options.allowEmpty) return { ok: true, errors: [], warnings: [] };
    return {
      ok: false,
      errors: [`No .feature files found under ${featureRoot}.`],
      warnings: []
    };
  }

  let totalErrors = 0;
  const aggErrors = [];
  const aggWarnings = [];
  const results = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const result = {
      file,
      ...validateFeatureContent(content, file, tagNames, language, { strictTags, aiTestingConfig, repoRoot: cwd })
    };
    results.push(result);
    const placement = validateFeatureFilePlacement(file, featureRootPath, content);
    result.placementWarnings = placement.warnings;
    const rel = relativeTo(cwd, file);

    if (result.errors.length > 0) {
      totalErrors += result.errors.length;
      for (const error of result.errors) aggErrors.push(`${rel}: ${error}`);
    }
    if (strictLayout) {
      totalErrors += placement.warnings.length;
      for (const warning of placement.warnings) aggErrors.push(`${rel}: ${warning}`);
    } else {
      for (const warning of placement.warnings) aggWarnings.push(`${rel}: ${warning}`);
    }
  }

  if (!options.noDuplicates) {
    const duplicateErrors = duplicateIdErrors(results);
    if (duplicateErrors.length > 0) {
      totalErrors += duplicateErrors.length;
      for (const error of duplicateErrors) aggErrors.push(`Duplicate identifier: ${error}`);
    }
  }

  return { ok: totalErrors === 0, errors: aggErrors, warnings: aggWarnings };
}
