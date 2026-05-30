import path from 'node:path';
import { getConfigValue } from './utils.mjs';
import { slug } from './project-config.mjs';

export function isKarateFramework(value) {
  return slug(value) === 'karate';
}

export function usesKarate(config) {
  const api = String(getConfigValue(config, 'automation.api.framework', '')).trim();
  const ui = String(getConfigValue(config, 'automation.ui.framework', '')).trim();
  return isKarateFramework(api) || isKarateFramework(ui);
}

export function defaultKarateApiSpecsPath() {
  return 'tests/karate/features/api';
}

export function defaultKarateUiSpecsPath() {
  return 'tests/karate/features/ui';
}

export function defaultKarateConfigPath() {
  return 'tests/karate/karate-config.js';
}

export function defaultKarateMocksPath() {
  return 'tests/karate/mocks';
}

export function defaultKaratePerformancePath() {
  return 'tests/karate/performance';
}

/**
 * Roots to scan for executable Karate .feature files.
 * @returns {string[]} unique relative directory paths
 */
export function karateFeatureRoots(config) {
  const roots = new Set();
  const overrideRoots = getConfigValue(config, 'automation.karate.featuresRoots', null);
  if (Array.isArray(overrideRoots) && overrideRoots.length > 0) {
    for (const item of overrideRoots) {
      const normalized = String(item || '').trim();
      if (normalized) roots.add(normalized.replace(/\\/g, '/'));
    }
    return [...roots];
  }

  const apiFramework = getConfigValue(config, 'automation.api.framework', '');
  const uiFramework = getConfigValue(config, 'automation.ui.framework', '');
  if (isKarateFramework(apiFramework)) {
    const apiPath = getConfigValue(config, 'automation.api.specsPath', defaultKarateApiSpecsPath());
    if (apiPath) roots.add(String(apiPath).replace(/\\/g, '/'));
  }
  if (isKarateFramework(uiFramework)) {
    const uiPath = getConfigValue(config, 'automation.ui.specsPath', defaultKarateUiSpecsPath());
    if (uiPath) roots.add(String(uiPath).replace(/\\/g, '/'));
  }

  return [...roots];
}

export function karateConfigPath(config) {
  return String(getConfigValue(config, 'automation.karate.configPath', defaultKarateConfigPath())).replace(/\\/g, '/');
}

export function isKarateUiFeaturePath(filePath, config) {
  const normalized = String(filePath).replace(/\\/g, '/').toLowerCase();
  const uiRoot = String(getConfigValue(config, 'automation.ui.specsPath', defaultKarateUiSpecsPath()))
    .replace(/\\/g, '/')
    .toLowerCase();
  if (isKarateFramework(getConfigValue(config, 'automation.ui.framework', ''))) {
    return (
      normalized.includes(uiRoot) || normalized.includes('/features/ui/') || normalized.includes('\\features\\ui\\')
    );
  }
  return false;
}

export function karateSecretScanRoots(config) {
  const dirs = new Set(karateFeatureRoots(config));
  const mocks = getConfigValue(config, 'automation.karate.mocksPath', defaultKarateMocksPath());
  if (mocks) dirs.add(String(mocks).replace(/\\/g, '/'));
  const configDir = path.dirname(karateConfigPath(config));
  if (configDir && configDir !== '.') dirs.add(configDir.replace(/\\/g, '/'));
  return [...dirs];
}
