import { DEFAULT_REQUIRED_TAGS } from './gherkin-constants.mjs';
import { validateFeatureFilePlacement } from './feature-layout.mjs';
import { duplicateIdErrors, normalizeLanguage, validateFeatureContent } from './gherkin-validate.mjs';
import { getConfigValue, loadQaAiConfig, relativeTo, resolveRepoPath } from './utils.mjs';
import { DEFAULT_FEATURE_PATH } from './artifact-paths.mjs';
import { listCollectionFiles, validateCollection } from './collection-validator.mjs';

/**
 * @returns {Promise<{ ok: boolean, errors: string[], warnings: string[] }>}
 */
export async function validateDesignFeatures(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const featureRoot = options.path || getConfigValue(configInfo.data, 'gherkin.featurePath', DEFAULT_FEATURE_PATH);
  const language = normalizeLanguage(
    options.gherkinLanguage || getConfigValue(configInfo.data, 'gherkin.language', 'en')
  );
  const requiredTags = getConfigValue(configInfo.data, 'gherkin.tags.required', DEFAULT_REQUIRED_TAGS);
  const tagNames = Array.isArray(requiredTags) && requiredTags.length > 0 ? requiredTags : DEFAULT_REQUIRED_TAGS;
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const strictTags = Boolean(options.strictTags);
  const strictLayout = Boolean(options.strictLayout);
  const aiTestingConfig = {
    enabled: Boolean(getConfigValue(configInfo.data, 'aiTesting.enabled', false)),
    requiredTechniques: getConfigValue(configInfo.data, 'aiTesting.requiredTechniques', []),
    optionalTechniques: getConfigValue(configInfo.data, 'aiTesting.optionalTechniques', [])
  };

  const listed = await listCollectionFiles(cwd, {
    fileArg: options.file,
    rootPaths: [featureRootPath],
    notUnderRootError: `file "${options.file}" is not under feature root "${featureRoot}".`,
    fileLabel: 'single feature file',
    fileFilter: (filePath) => filePath.endsWith('.feature')
  });
  if (!listed.ok) return { ok: false, errors: listed.errors, warnings: [] };

  const noDuplicates = Boolean(options.noDuplicates || options.file);

  return validateCollection({
    files: listed.files,
    allowEmpty: Boolean(options.allowEmpty),
    emptyErrors: [`No .feature files found under ${featureRoot}.`],
    validateFile: async (file, content) => {
      const parsed = {
        file,
        ...validateFeatureContent(content, file, tagNames, language, { strictTags, aiTestingConfig, repoRoot: cwd })
      };
      const placement = validateFeatureFilePlacement(file, featureRootPath, content);
      const rel = relativeTo(cwd, file);
      const errors = parsed.errors.map((error) => `${rel}: ${error}`);
      const warnings = [];
      if (strictLayout) {
        errors.push(...placement.warnings.map((warning) => `${rel}: ${warning}`));
      } else {
        warnings.push(...placement.warnings.map((warning) => `${rel}: ${warning}`));
      }
      return { errors, warnings, parsed };
    },
    duplicateCheck: noDuplicates
      ? null
      : (items) => duplicateIdErrors(items.map((item) => item.parsed)).map((error) => `Duplicate identifier: ${error}`)
  });
}
