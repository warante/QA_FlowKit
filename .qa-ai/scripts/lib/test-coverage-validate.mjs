import fs from 'node:fs/promises';
import { featureCoverageRecord, normalizeCoverageMode, validateCoverage } from './test-coverage.mjs';
import {
  mergeCoverageResults,
  resolveNonFunctionalCoveragePolicy,
  validateSourceNfrCoverage
} from './nfr-coverage.mjs';
import { mergeSemanticCoverageResults, validateSemanticCoverage } from './semantic-coverage.mjs';
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

function coveragePolicy(config) {
  return {
    requirePositive: Boolean(getConfigValue(config, 'testDesign.coverage.requirePositive', true)),
    requireNegative: Boolean(getConfigValue(config, 'testDesign.coverage.requireNegative', true)),
    requireAlternative: Boolean(getConfigValue(config, 'testDesign.coverage.requireAlternative', true)),
    requireBoundaryWhenApplicable: Boolean(
      getConfigValue(config, 'testDesign.coverage.requireBoundaryWhenApplicable', true)
    ),
    requireAccessibilityWhenApplicable: Boolean(
      getConfigValue(config, 'testDesign.coverage.requireAccessibilityWhenApplicable', false)
    ),
    requirePerformanceWhenApplicable: Boolean(
      getConfigValue(config, 'testDesign.coverage.requirePerformanceWhenApplicable', false)
    ),
    requireSecurityReview: Boolean(getConfigValue(config, 'testDesign.coverage.requireSecurityReview', false)),
    requireTechniqueTraceability: Boolean(
      getConfigValue(config, 'testDesign.coverage.requireTechniqueTraceability', false)
    ),
    requireCriterionCoverage: Boolean(getConfigValue(config, 'testDesign.coverage.requireCriterionCoverage', false))
  };
}

export async function validateTestCoverage(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const mode = normalizeCoverageMode(options.mode || getConfigValue(config, 'testDesign.coverage.mode', 'off'));
  const featureRoot = options.path || getConfigValue(config, 'gherkin.featurePath', 'features');
  const proposalPath =
    options.proposalPath || getConfigValue(config, 'testDesign.proposalPath', ARTIFACT_PATHS.testDesignProposal);
  const featureRootPath = resolveRepoPath(cwd, featureRoot, { label: 'feature root' });
  const files = await listFilesRecursive(featureRootPath, (filePath) => filePath.endsWith('.feature'));
  const requestedRf = String(options.rf || '')
    .trim()
    .toUpperCase();
  const features = [];
  for (const file of files) {
    const record = featureCoverageRecord(file, await fs.readFile(file, 'utf8'));
    if (!requestedRf || record.rf === requestedRf) features.push(record);
  }

  const proposalAbsolute = resolveRepoPath(cwd, proposalPath, { label: 'test design proposal' });
  const normalizedPath = options.normalizedPath || ARTIFACT_PATHS.normalizedRequirements;
  const normalizedAbsolute = resolveRepoPath(cwd, normalizedPath, { label: 'normalized requirements' });
  let proposalContent = '';
  let normalizedContent = '';
  if (await pathExists(proposalAbsolute)) {
    proposalContent = await readText(proposalAbsolute);
  } else if (!options.allowMissing && mode !== 'off') {
    const severity = mode === 'strict' ? 'error' : 'warning';
    const finding = {
      severity,
      rf: '',
      rule: 'proposal-missing',
      message: `Test design proposal not found: ${proposalPath}`
    };
    return {
      ok: severity !== 'error',
      mode,
      skipped: false,
      featureRoot,
      proposalPath,
      findings: [finding],
      errors: severity === 'error' ? [finding] : [],
      warnings: severity === 'warning' ? [finding] : []
    };
  }

  if (await pathExists(normalizedAbsolute)) {
    normalizedContent = await readText(normalizedAbsolute);
  }

  const preventive = validateCoverage({
    features,
    proposalContent,
    policy: coveragePolicy(config),
    mode
  });
  const nfrPolicy = resolveNonFunctionalCoveragePolicy(config);
  const sourceNfr = validateSourceNfrCoverage({
    normalizedContent,
    proposalContent,
    features,
    mode: nfrPolicy.mode,
    policy: nfrPolicy
  });
  const semantic = validateSemanticCoverage({
    normalizedContent,
    proposalContent,
    features,
    featureRoot,
    mode,
    policy: coveragePolicy(config),
    options: {
      allowMissingArtifacts: Boolean(options.allowMissing)
    }
  });
  const merged = mergeSemanticCoverageResults(mergeCoverageResults(preventive, sourceNfr), semantic);
  const featureGateOk = features.length > 0 || Boolean(options.allowEmpty) || mode === 'off';

  return {
    ...merged,
    ok: merged.ok && featureGateOk,
    skipped: mode === 'off' && nfrPolicy.mode === 'off',
    featureRoot,
    proposalPath,
    normalizedPath,
    message: features.length === 0 ? `No .feature files found under ${featureRoot}.` : undefined,
    features: features.map((feature) => ({
      ...feature,
      file: relativeTo(cwd, feature.file)
    }))
  };
}
