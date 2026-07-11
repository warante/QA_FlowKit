export function collectLegacyConfigSignals(config) {
  const requirements = config?.requirements || {};
  const legacyKeys = [];
  if (requirements.allowInferredAcceptanceCriteria !== undefined) {
    legacyKeys.push('requirements.allowInferredAcceptanceCriteria');
  }
  if (requirements.requireApprovalForInferredCriteria !== undefined) {
    legacyKeys.push('requirements.requireApprovalForInferredCriteria');
  }
  if (config?.gherkin?.oneScenarioPerFile !== undefined) {
    legacyKeys.push('gherkin.oneScenarioPerFile');
  }
  return legacyKeys;
}

export const LEGACY_CONFIG_MIGRATION_DOC = 'docs/qa-ai/beta-to-1.0-migration.md';
