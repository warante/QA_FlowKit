import fs from 'node:fs/promises';
import { featureTraceabilityIds, validateTraceabilityArtifacts } from './traceability-validate.mjs';
import {
  getConfigValue,
  listFilesRecursive,
  loadQaAiConfig,
  pathExists,
  readText,
  relativeTo,
  resolveRepoPath
} from './utils.mjs';
import { ARTIFACT_PATHS } from './artifact-paths.mjs';

/**
 * @returns {Promise<object>}
 */
export async function validateTraceability(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const featureRoot = options.features || getConfigValue(config, 'gherkin.featurePath', 'features');
  const matrixPath =
    options.path || getConfigValue(config, 'traceability.matrixPath', ARTIFACT_PATHS.traceabilityMatrix);
  const normalizedPath = options.normalizedPath || ARTIFACT_PATHS.normalizedRequirements;
  const proposalPath =
    options.proposalPath || getConfigValue(config, 'testDesign.proposalPath', ARTIFACT_PATHS.testDesignProposal);
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const matrixFilePath = resolveRepoPath(cwd, matrixPath, { label: 'traceability matrix' });
  const normalizedFilePath = resolveRepoPath(cwd, normalizedPath, { label: 'normalized requirements' });
  const proposalFilePath = resolveRepoPath(cwd, proposalPath, { label: 'test design proposal' });
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const features = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    features.push({
      ...featureTraceabilityIds(file, content),
      file: relativeTo(cwd, file)
    });
  }

  if (features.length === 0 && !options.allowEmpty) {
    return {
      ok: false,
      skipped: false,
      featureRoot,
      matrixPath,
      normalizedPath,
      errors: [`No .feature files found under ${featureRoot}.`],
      warnings: [],
      message: `No .feature files found under ${featureRoot}.`
    };
  }

  if (!(await pathExists(matrixFilePath))) {
    if (options.allowMissing) {
      return {
        ok: true,
        skipped: true,
        featureRoot,
        matrixPath,
        normalizedPath,
        errors: [],
        warnings: [],
        message: `Traceability matrix not found at ${matrixPath}.`
      };
    }
    return {
      ok: false,
      skipped: false,
      featureRoot,
      matrixPath,
      normalizedPath,
      errors: [`Traceability matrix not found at ${matrixPath}.`],
      warnings: [],
      message: `Traceability matrix not found at ${matrixPath}.`
    };
  }

  const matrixContent = await readText(matrixFilePath);
  const normalizedContent = (await pathExists(normalizedFilePath)) ? await readText(normalizedFilePath) : '';
  const proposalContent = (await pathExists(proposalFilePath)) ? await readText(proposalFilePath) : '';
  const result = validateTraceabilityArtifacts({
    matrixContent,
    normalizedContent,
    proposalContent,
    features,
    featureRoot
  });

  return {
    ...result,
    skipped: false,
    featureRoot,
    matrixPath,
    normalizedPath,
    features
  };
}
