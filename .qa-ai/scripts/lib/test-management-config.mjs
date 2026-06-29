import { DEFAULT_TEST_MANAGEMENT_SYNC_PLAN_PATH, getConfigValue } from './utils.mjs';

export function getTestManagementMappingFile(config) {
  return getConfigValue(
    config,
    'testManagement.mappingFile',
    getConfigValue(config, 'testrail.mappingFile', 'qa-ai-output/test-management-mapping.json')
  );
}

export function getTestManagementSyncPlanPath(config) {
  return getConfigValue(
    config,
    'testManagement.syncPlanPath',
    getConfigValue(config, 'testrail.syncPlanPath', DEFAULT_TEST_MANAGEMENT_SYNC_PLAN_PATH)
  );
}

export function isTestManagementEnabled(config) {
  const tool = String(getConfigValue(config, 'project.tools.testManagement', ''))
    .trim()
    .toLowerCase();
  if (tool && tool !== 'none') return true;
  return Boolean(getConfigValue(config, 'testManagement.enabled', getConfigValue(config, 'testrail.enabled', false)));
}
