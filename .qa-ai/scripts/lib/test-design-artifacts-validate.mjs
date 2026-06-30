import { validateTestDesignProposal, validateTestDesignSystem } from './test-design.mjs';
import { featureCoverageRecord, validateAiCoverage } from './test-coverage.mjs';
import { getConfigValue, listFilesRecursive, loadQaAiConfig, pathExists, readText, resolveRepoPath } from './utils.mjs';
import { ARTIFACT_PATHS, DEFAULT_FEATURE_PATH, siblingArtifactPath } from './artifact-paths.mjs';

async function validateFile(cwd, filePath, validator, options = {}) {
  const absolute = resolveRepoPath(cwd, filePath, { label: 'test design file' });
  if (!(await pathExists(absolute))) {
    if (options.allowMissing) {
      return { ok: true, skipped: true, path: filePath, errors: [] };
    }
    return { ok: false, skipped: false, path: filePath, errors: [`Test design file not found: ${filePath}`] };
  }

  const content = await readText(absolute);
  const result = validator(content, options.validatorOptions || {});
  const errors = result.errors.map((error) => `${filePath}: ${error}`);
  return { ok: result.ok, skipped: false, path: filePath, errors };
}

export async function validateTestDesignArtifacts(cwd, options = {}) {
  const configInfo = await loadQaAiConfig(cwd);
  const config = configInfo.data || {};
  const systemPath =
    options.systemPath || getConfigValue(config, 'testDesign.systemPath', ARTIFACT_PATHS.testDesignSystem);
  const proposalPath =
    options.proposalPath || getConfigValue(config, 'testDesign.proposalPath', ARTIFACT_PATHS.testDesignProposal);

  const normalizedPath = options.normalizedPath || siblingArtifactPath(proposalPath, 'normalized-requirements.md');
  const normalizedAbsolute = resolveRepoPath(cwd, normalizedPath, { label: 'normalized requirements' });
  const normalizedContent = (await pathExists(normalizedAbsolute)) ? await readText(normalizedAbsolute) : '';
  const coverageMode = String(getConfigValue(config, 'testDesign.coverage.mode', 'off')).toLowerCase();

  const allowMissing = Boolean(options.allowMissing);
  const validatorOptions = {
    requireOfficialRfId: Boolean(options.requireRfId),
    requireCoverageSections: coverageMode === 'strict',
    normalizedContent,
    semanticMode: coverageMode === 'off' ? 'advisory' : coverageMode
  };

  const system = await validateFile(cwd, systemPath, validateTestDesignSystem, {
    allowMissing,
    validatorOptions
  });
  const proposal = await validateFile(cwd, proposalPath, validateTestDesignProposal, {
    allowMissing,
    validatorOptions
  });

  const aiTestingEnabled = Boolean(getConfigValue(config, 'aiTesting.enabled', false));
  const aiCoverageMode = getConfigValue(config, 'testDesign.coverage.mode', 'off');
  const aiRequiredTechniques = getConfigValue(config, 'aiTesting.requiredTechniques', []);
  let aiCoverage = { ok: true, findings: [], errors: [], warnings: [] };
  if (aiTestingEnabled) {
    const featurePath = getConfigValue(config, 'gherkin.featurePath', DEFAULT_FEATURE_PATH);
    const featureRootPath = resolveRepoPath(cwd, featurePath, { label: 'feature root' });
    let featureFiles;
    try {
      featureFiles = await listFilesRecursive(featureRootPath, (f) => f.endsWith('.feature'));
    } catch (error) {
      return {
        ok: false,
        system,
        proposal,
        aiCoverage,
        errors: [...system.errors, ...proposal.errors, `Unable to read feature root: ${error.message}`]
      };
    }
    const features = [];
    const readErrors = [];
    for (const file of featureFiles) {
      try {
        features.push(featureCoverageRecord(file, await readText(file)));
      } catch (error) {
        readErrors.push(`${file}: ${error.message}`);
      }
    }
    if (readErrors.length > 0) {
      return {
        ok: false,
        system,
        proposal,
        aiCoverage,
        errors: [...system.errors, ...proposal.errors, ...readErrors]
      };
    }
    const proposalAbsolute = resolveRepoPath(cwd, proposalPath, { label: 'proposal' });
    const proposalContent = (await pathExists(proposalAbsolute)) ? await readText(proposalAbsolute) : '';
    aiCoverage = validateAiCoverage({
      features,
      proposalContent,
      requiredTechniques: Array.isArray(aiRequiredTechniques) ? aiRequiredTechniques : [],
      mode: aiCoverageMode
    });
  }

  const errors = [...system.errors, ...proposal.errors, ...aiCoverage.errors.map((f) => f.message)];
  return {
    ok: errors.length === 0,
    system,
    proposal,
    aiCoverage,
    errors
  };
}
